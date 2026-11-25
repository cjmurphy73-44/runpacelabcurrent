import { useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServices } from "@/services/providers/ServiceContext";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { isPro, hasFeature, type GatedFeature } from "@/lib/subscriptionFeatures";
import { isSubscriptionActive } from "../../base44/shared/planGate";

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
  const userId = user?.id;
  const subscription = useQuery({
    queryKey: ["subscription", userId],
    enabled: Boolean(userId),
    queryFn: async () => (await subscriptionRepo.filter({ user_id: userId }, "-created_date", 1))[0] ?? null,
    staleTime: 60_000,
    retry: false,
  });
  const current = subscription.isError ? null : subscription.data;
  const plan = current && isSubscriptionActive(current) ? current.plan || "free" : "free";
  const status = current?.status || "active";
  const loading = Boolean(userId) && subscription.isPending;
  const { refetch } = subscription;

  const refresh = useCallback(async () => {
    if (userId) await refetch({ cancelRefetch: false });
  }, [refetch, userId]);

  useEffect(() => {
    if (!loading && !subscriptionActiveTracked && plan && plan !== "free" && status === "active") {
      subscriptionActiveTracked = true;
      try { base44.analytics.track({ eventName: "subscription_active", properties: { plan } }); } catch {}
    }
  }, [loading, plan, status]);

  return { plan, status, loading, isPro: isPro(plan), hasFeature: (f) => hasFeature(plan, f), refresh };
}
