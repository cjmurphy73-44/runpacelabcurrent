import { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { isPro, hasFeature, type GatedFeature } from "@/lib/subscriptionFeatures";

export interface SubscriptionState {
  plan: string;
  status: string;
  loading: boolean;
  isPro: boolean;
  hasFeature: (f: GatedFeature) => boolean;
  refresh: () => Promise<void>;
}

export function useSubscription(): SubscriptionState {
  const { user } = useAuth();
  const [plan, setPlan] = useState("free");
  const [status, setStatus] = useState("active");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }
    try {
      const rows = await base44.entities.Subscription.filter({ user_id: user.id }, "-created_date", 5);
      const sub = rows[0];
      if (sub) { setPlan(sub.plan); setStatus(sub.status); }
      else { setPlan("free"); setStatus("active"); }
    } catch {
      setPlan("free"); setStatus("active");
    } finally { setLoading(false); }
  }, [user?.id]);

  useEffect(() => { refresh(); }, [refresh]);

  return { plan, status, loading, isPro: isPro(plan), hasFeature: (f) => hasFeature(plan, f), refresh };
}