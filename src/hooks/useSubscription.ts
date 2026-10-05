import { useEffect, useState, useCallback } from "react";
import { useServices } from "@/services/providers/ServiceContext";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { isPro, hasFeature, type GatedFeature } from "@/lib/subscriptionFeatures";

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
  const [plan, setPlan] = useState("free");
  const [status, setStatus] = useState("active");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }
    try {
      const rows = await subscriptionRepo.filter({ user_id: user.id }, "-created_date", 5);
      const sub = rows[0];
      if (sub) { setPlan(sub.plan); setStatus(sub.status); }
      else { setPlan("free"); setStatus("active"); }
    } catch {
      setPlan("free"); setStatus("active");
    } finally { setLoading(false); }
  }, [subscriptionRepo, user?.id]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!loading && !subscriptionActiveTracked && plan && plan !== "free" && status === "active") {
      subscriptionActiveTracked = true;
      try { base44.analytics.track({ eventName: "subscription_active", properties: { plan } }); } catch {}
    }
  }, [loading, plan, status]);

  return { plan, status, loading, isPro: isPro(plan), hasFeature: (f) => hasFeature(plan, f), refresh };
}