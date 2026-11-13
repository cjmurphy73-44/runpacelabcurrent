import { useEffect, useState, useCallback, useRef } from "react";
import { useServices } from "@/services/providers/ServiceContext";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { isPro, hasFeature, type GatedFeature } from "@/lib/subscriptionFeatures";
import { resolveSubscriptionEntitlement } from "@/lib/resolveSubscriptionEntitlement";

// Module-level guard so subscription_active fires once per browser session,
// not on every hook remount.
let subscriptionActiveTracked = false;

export interface SubscriptionState {
  plan: string;
  status: string;
  loading: boolean;
  isPro: boolean;
  hasFeature: (f: GatedFeature) => boolean;
  refresh: () => Promise<void>;
}

export function useSubscription(): SubscriptionState {
  const { subscriptionRepo } = useServices();
  const { user } = useAuth();
  const [snapshot, setSnapshot] = useState({ userId: "", plan: "free", status: "unknown" });
  const [loading, setLoading] = useState(true);
  const requestSequence = useRef(0);
  const currentUserId = useRef(user?.id);
  // Update synchronously during render: a response for the previous account
  // must never commit paid entitlement after an account switch.
  currentUserId.current = user?.id;

  const refresh = useCallback(async () => {
    const requestedUserId = user?.id;
    const request = ++requestSequence.current;
    if (!requestedUserId) {
      setSnapshot({ userId: "", plan: "free", status: "unknown" });
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const rows = await subscriptionRepo.filter({ user_id: requestedUserId }, "-created_date", 5);
      if (request !== requestSequence.current || currentUserId.current !== requestedUserId) return;
      setSnapshot({ userId: requestedUserId, ...resolveSubscriptionEntitlement(rows) });
    } catch {
      if (request !== requestSequence.current || currentUserId.current !== requestedUserId) return;
      setSnapshot({ userId: requestedUserId, plan: "free", status: "unknown" });
    } finally {
      if (request === requestSequence.current && currentUserId.current === requestedUserId) {
        setLoading(false);
      }
    }
  }, [subscriptionRepo, user?.id]);

  useEffect(() => { refresh(); }, [refresh]);

  // Render-time identity gate closes the interval before the effect fires.
  // An old account's paid state is never exposed to a new or signed-out user.
  const sameAccount = Boolean(user?.id && snapshot.userId === user.id);
  const plan = sameAccount ? snapshot.plan : "free";
  const status = sameAccount ? snapshot.status : "unknown";
  const pending = Boolean(user?.id) && (!sameAccount || loading);

  useEffect(() => {
    if (!pending && !subscriptionActiveTracked && plan !== "free" && status === "active") {
      subscriptionActiveTracked = true;
      try { base44.analytics.track({ eventName: "subscription_active", properties: { plan } }); } catch {}
    }
  }, [pending, plan, status]);

  return { plan, status, loading: pending, isPro: isPro(plan),
    hasFeature: (f) => hasFeature(plan, f), refresh };
}
