import { useMemo } from 'react';
import { useSubscription } from './useSubscription';
import { FREE_LIMITS } from '@/lib/subscriptionFeatures';

// Counts the user's outbound coach messages in the last 7 days and exposes the
// free-tier weekly limit so CoachChat can gate sending and show an upgrade CTA.
// Pro users are uncapped. Counts `role === 'user'` messages with a timestamp in
// the rolling 7-day window; undated messages are counted as recent (defensive).
export function useCoachMessageLimit(messages: any[]) {
  const { isPro, loading } = useSubscription();

  const usedThisWeek = useMemo(() => {
    if (isPro) return 0;
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return (messages || []).filter((m) => {
      if (!m || m.role !== 'user') return false;
      const ts = m.created_date || m.created_at || m.timestamp || m.createdAt;
      if (!ts) return true;
      const t = new Date(ts).getTime();
      return isNaN(t) || t >= sevenDaysAgo;
    }).length;
  }, [messages, isPro]);

  const limit = isPro ? Infinity : FREE_LIMITS.aiCoachMessagesPerWeek;
  const remaining = isPro ? Infinity : Math.max(0, limit - usedThisWeek);
  const limitReached = !loading && !isPro && remaining === 0;

  return { usedThisWeek, limit, remaining, limitReached, isPro, loading };
}