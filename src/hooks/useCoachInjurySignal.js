import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { computeInjurySignal } from "@/lib/coachInjurySignal";

/**
 * useCoachInjurySignal — surfaces the latest injury/recovery signal parsed from the
 * athlete's coach conversation so every surface (Today's Session, Intelligence Hub,
 * Training Plan, Calendar) can react consistently to a coach-directed hold.
 *
 * Returns:
 *   loading: boolean
 *   level:   'none' | 'caution' | 'hold'
 *   evidence: [{ date, type, snippet }]
 *   lastInjuryDate: string | null
 *   summary: string | null
 *   holdReason: string | null  (set only when level === 'hold')
 */
export function useCoachInjurySignal(athleteId) {
  const [state, setState] = useState({
    loading: true,
    level: "none",
    evidence: [],
    lastInjuryDate: null,
    summary: null,
    holdReason: null,
  });

  useEffect(() => {
    if (!athleteId) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const msgs = await base44.entities.CoachMessage.filter(
          { athlete_id: athleteId },
          "-created_date",
          30
        );
        const signal = computeInjurySignal(msgs || []);
        if (!cancelled) setState({ loading: false, ...signal });
      } catch {
        if (!cancelled) {
          setState({
            loading: false,
            level: "none",
            evidence: [],
            lastInjuryDate: null,
            summary: null,
            holdReason: null,
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [athleteId]);

  return state;
}