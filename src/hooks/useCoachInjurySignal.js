import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useServices } from "@/services/providers/ServiceContext";
import { computeInjurySignal } from "@/lib/coachInjurySignal";
import { publishHoldCleared, subscribeHoldCleared } from "@/lib/coachHoldEvents";

const EMPTY = { level: "none", evidence: [], lastInjuryDate: null, summary: null, holdReason: null };

/**
 * useCoachInjurySignal: the single derived coach hold for every surface
 * (Today's Session, Training Plan, Training Calendar).
 *
 * The hold comes from the coach conversation plus the persisted
 * `coach_hold_cleared_at` on the athlete profile. It is never inferred from plan text.
 *
 * Returns:
 *   loading      boolean, still fetching
 *   error        string | null, data could not be loaded (NOT a clearance)
 *   level        'none' | 'caution' | 'hold'
 *   evidence     [{ date, type, source, snippet }]
 *   summary / holdReason: string | null
 *   clearedAt    string | null
 *   clearedByCoach boolean
 *   clearHold    () => Promise<void>  throws when the save fails
 *   clearing     boolean
 *   clearError   string | null
 *   reload       () => Promise<void>
 */
export function useCoachInjurySignal(athleteId) {
  const { coachMessageRepo } = useServices();
  const [messages, setMessages] = useState(null);
  const [clearedAt, setClearedAt] = useState(null);
  const [loading, setLoading] = useState(Boolean(athleteId));
  const [error, setError] = useState(null);
  const [clearing, setClearing] = useState(false);
  const [clearError, setClearError] = useState(null);
  const clearingRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    if (!athleteId) {
      if (!mountedRef.current) return;
      setMessages([]);
      setClearedAt(null);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [msgs, profile] = await Promise.all([
        coachMessageRepo.filter({ athlete_id: athleteId }, "-created_date", 30),
        base44.entities.AthleteProfile.get(athleteId),
      ]);
      if (!mountedRef.current) return;
      setMessages(Array.isArray(msgs) ? msgs : []);
      setClearedAt(profile?.coach_hold_cleared_at || null);
    } catch (e) {
      if (!mountedRef.current) return;
      // Unavailable is not clearance: keep whatever we last knew and surface the failure.
      setError(e?.message || "Could not load your coaching status");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [athleteId, coachMessageRepo]);

  useEffect(() => {
    load();
  }, [load]);

  // Another surface cleared the hold, adopt it here so the whole page agrees.
  useEffect(() => {
    return subscribeHoldCleared(({ athleteId: clearedFor, clearedAt: at }) => {
      if (clearedFor && athleteId && clearedFor !== athleteId) return;
      if (!mountedRef.current) return;
      setClearedAt(at);
    });
  }, [athleteId]);

  const signal = useMemo(
    () => computeInjurySignal(messages || [], { clearedAt }),
    [messages, clearedAt]
  );

  const clearHold = useCallback(async () => {
    if (!athleteId) throw new Error("No athlete profile to update.");
    // Duplicate clicks must not write twice or race each other.
    if (clearingRef.current) return;
    clearingRef.current = true;
    setClearing(true);
    setClearError(null);
    try {
      const now = new Date().toISOString();
      await base44.entities.AthleteProfile.update(athleteId, {
        coach_hold_cleared_at: now,
      });
      // Do not infer persistence from a successful update request alone: some
      // SDK responses contain only an ID. Read the stored profile back before
      // releasing the hold on any mounted surface.
      const verified = await base44.entities.AthleteProfile.get(athleteId);
      const persisted = verified?.coach_hold_cleared_at;
      const persistedMs = Date.parse(persisted || "");
      if (!Number.isFinite(persistedMs) || persistedMs < Date.parse(now) - 1000) {
        throw new Error("Clearance could not be verified. The coach hold remains active.");
      }
      if (mountedRef.current) setClearedAt(persisted);
      publishHoldCleared(athleteId, persisted);
    } catch (e) {
      const message = e?.message || "Could not save the clearance.";
      if (mountedRef.current) setClearError(message);
      throw e;
    } finally {
      clearingRef.current = false;
      if (mountedRef.current) setClearing(false);
    }
  }, [athleteId]);

  return {
    ...EMPTY,
    ...signal,
    loading,
    error,
    unavailable: Boolean(error),
    clearedAt: signal.clearedAt || null,
    clearing,
    clearError,
    clearHold,
    reload: load,
  };
}