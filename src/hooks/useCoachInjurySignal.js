import { useCallback, useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useServices } from "@/services/providers/ServiceContext";
import { computeInjurySignal } from "@/lib/coachInjurySignal";

const EMPTY = { level: "none", evidence: [], lastInjuryDate: null, summary: null, holdReason: null };

/**
 * useCoachInjurySignal, surfaces the latest injury/recovery signal parsed from the
 * athlete's coach conversation so every surface (Today's Session, Plan, Calendar) can
 * react consistently to a coach-directed hold.
 *
 * A hold is resolveable from the UI: `clearHold()` stamps the athlete profile, which
 * retires every coach message before that moment. The coach can also release it by
 * saying so in chat, which resolves it without any athlete action.
 *
 * Returns:
 *   loading:  boolean
 *   level:    'none' | 'caution' | 'hold'
 *   evidence: [{ date, type, snippet }]
 *   summary / holdReason: string | null
 *   clearedAt: string | null, when the current hold was resolved
 *   clearedByCoach: boolean, true when the coach released it in conversation
 *   clearHold: () => Promise<void>
 *   clearing: boolean
 */
export function useCoachInjurySignal(athleteId) {
  const { coachMessageRepo } = useServices();
  const [messages, setMessages] = useState(null);
  const [clearedAt, setClearedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    if (!athleteId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const [msgs, profile] = await Promise.all([
          coachMessageRepo.filter({ athlete_id: athleteId }, "-created_date", 30),
          base44.entities.AthleteProfile.get(athleteId).catch(() => null),
        ]);
        if (cancelled) return;
        setMessages(msgs || []);
        setClearedAt(profile?.coach_hold_cleared_at || null);
      } catch {
        if (!cancelled) setMessages([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [athleteId, coachMessageRepo]);

  const signal = useMemo(
    () => computeInjurySignal(messages || [], { clearedAt }),
    [messages, clearedAt]
  );

  const clearHold = useCallback(async () => {
    if (!athleteId) return;
    setClearing(true);
    try {
      const now = new Date().toISOString();
      await base44.entities.AthleteProfile.update(athleteId, { coach_hold_cleared_at: now });
      setClearedAt(now);
    } finally {
      setClearing(false);
    }
  }, [athleteId]);

  return { ...EMPTY, ...signal, loading, clearing, clearHold };
}