// src/hooks/usePlannedActualReconciliation.ts
// Loads an athlete's unlinked ingested sessions and pending scheduled plan sessions,
// runs the WorkoutMatchingEngine, auto-links high-confidence matches, and exposes:
//  - reviewable matches (lower confidence) for manual confirm
//  - auto-linked matches pending user verification (confirm / reject-unlink)
//  - overdue planned sessions (pending + date passed + no linked workout) for skip
// confirmMatch / rejectAutoLink / markSkipped mutate the plan session status and the
// workout link. Completion outcome is split into completed / partial / excess from the
// actual-to-prescribed duration ratio.

import { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { workoutMatchingEngine } from '@/services/workoutMatchingEngine';

const AUTO_CONFIDENCE = 0.9;

function todayKey() {
  return new Date().toISOString().split('T')[0];
}

function statusForMatch(match) {
  const ratio = match.varianceDetails?.completionRatio;
  const isShort = isNaN(ratio) ? match.matchStatus === 'COMPLETED_SHORT' : ratio < 0.95;
  switch (match.matchStatus) {
    case 'EXACT': return 'completed';
    case 'COMPLETED_SHORT': return 'partial';
    case 'COMPLETED_EXCEEDED': return 'excess';
    case 'PLAUSIBLE': return isShort ? 'partial' : 'excess';
    default: return 'partial'; // fallback for matched rows
  }
}

export function usePlannedActualReconciliation(athleteId) {
  const [matches, setMatches] = useState([]);
  const [autoLinked, setAutoLinked] = useState([]); // pending user verification
  const [overdue, setOverdue] = useState([]);
  const [todaySessions, setTodaySessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmingId, setConfirmingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [skippingId, setSkippingId] = useState(null);
  const [markingId, setMarkingId] = useState(null);
  const [lastConfirmed, setLastConfirmed] = useState(null);
  const [lastRejected, setLastRejected] = useState(null);
  const [lastSkipped, setLastSkipped] = useState(null);
  const [lastMarkedDone, setLastMarkedDone] = useState(null);
  const [adjustingId, setAdjustingId] = useState(null);
  const [lastAdjustment, setLastAdjustment] = useState(null);

  // C-13 Adaptive re-planning: when a planned session deviates (skipped / partial
  // / excess) the coach automatically re-optimizes the remaining block via the
  // autoReplanOnDeviation backend function. Fire-and-forget from the mutation
  // site; the result lands as `lastAdjustment` and surfaces as a coaching toast.
  const triggerReplan = useCallback(async (sessionId) => {
    setAdjustingId(sessionId);
    try {
      const res = await base44.functions.invoke('autoReplanOnDeviation', { session_id: sessionId });
      setLastAdjustment({ sessionId, summary: res?.summary || 'Your coach is adjusting the rest of your week.', ok: !res?.error });
    } catch (e) {
      setLastAdjustment({ sessionId, summary: 'Coach adjustment is running in the background.', ok: false });
    } finally {
      setAdjustingId(null);
    }
  }, []);

  const load = useCallback(async () => {
    if (!athleteId) return;
    setLoading(true);
    setError(null);
    try {
      const [sessions, planned] = await Promise.all([
        base44.entities.WorkoutSession.filter({ athlete_id: athleteId }, '-date', 60),
        base44.entities.TrainingPlanSession.filter({ athlete_id: athleteId }, '-date', 200),
      ]);

      const ingested = (sessions || [])
        .filter((s) => !s.training_plan_session_id)
        .map((s) => ({
          sessionId: s.id,
          date: s.date,
          sport: s.sport,
          durationMinutes: s.duration_minutes || 0,
          distanceKm: s.distance_km,
        }));

      const today = new Date();
      const since = new Date(today); since.setDate(since.getDate() - 30);
      const sinceKey = since.toISOString().split('T')[0];
      const tKey = todayKey();

      const candidates = (planned || [])
        .filter((p) => (!p.status || p.status === 'pending') && p.date >= sinceKey)
        .map((p) => ({
          id: p.id,
          date: p.date,
          sport: p.sport,
          targetDurationMinutes: p.prescribed_duration_minutes,
          targetDistanceKm: undefined,
          status: p.status,
        }));

      const all = workoutMatchingEngine.matchAll(ingested, candidates).filter((m) => m.matchStatus !== 'UNMATCHED');

      const linkedScheduled = new Set();
      const autoLinkedRows = [];
      const reviewable = [];
      for (const m of all) {
        const canAuto = m.matchStatus === 'EXACT' && m.confidenceScore >= AUTO_CONFIDENCE && !linkedScheduled.has(m.scheduledWorkoutId);
        if (!canAuto) { reviewable.push(m); continue; }
        try {
          await base44.entities.TrainingPlanSession.update(m.scheduledWorkoutId, { status: 'completed' });
          await base44.entities.WorkoutSession.update(m.sessionId, { training_plan_session_id: m.scheduledWorkoutId });
          linkedScheduled.add(m.scheduledWorkoutId);
          autoLinkedRows.push(m);
        } catch {
          reviewable.push(m);
        }
      }

      // Overdue = pending (not matched this pass — strict or plausible — and not previously
      // completed) with date < today. A plausible match (e.g. 21% over-duration) must NOT
      // surface here — it belongs in the reviewable list for user confirm instead.
      const matchedScheduledIds = new Set(
        all.filter((m) => m.matchStatus !== 'UNMATCHED').map((m) => m.scheduledWorkoutId)
      );
      const tK = tKey;
      // Unmarked plan sessions older than 7 days are silently dropped — not shown, not
      // mutated (the pending record stays in the DB). Only sessions within the last week
      // surface as overdue for the user to skip or confirm.
      const overdueCutoff = new Date(today); overdueCutoff.setDate(overdueCutoff.getDate() - 7);
      const overdueCutoffKey = overdueCutoff.toISOString().split('T')[0];
      const todayRows = (planned || [])
        .filter((p) => (!p.status || p.status === 'pending') && p.date === tK)
        .filter((p) => !linkedScheduled.has(p.id) && !matchedScheduledIds.has(p.id))
        .map((p) => ({
          id: p.id,
          date: p.date,
          sport: p.sport,
          prescribedDurationMinutes: p.prescribed_duration_minutes,
          intensityZone: p.prescribed_intensity_zone,
        }));
      const overdueRows = (planned || [])
        .filter((p) => (!p.status || p.status === 'pending') && p.date < tK && p.date >= overdueCutoffKey)
        .filter((p) => !linkedScheduled.has(p.id) && !matchedScheduledIds.has(p.id))
        .map((p) => ({
          id: p.id,
          date: p.date,
          sport: p.sport,
          prescribedDurationMinutes: p.prescribed_duration_minutes,
          intensityZone: p.prescribed_intensity_zone,
        }));

      setMatches(reviewable);
      setAutoLinked(autoLinkedRows);
      setOverdue(overdueRows);
      setTodaySessions(todayRows);
    } catch (e) {
      setError(e?.message || 'Failed to load reconciliation matches');
    } finally {
      setLoading(false);
    }
  }, [athleteId]);

  useEffect(() => { load(); }, [load]);

  const confirmMatch = useCallback(async (match) => {
    if (!match || !match.scheduledWorkoutId || confirmingId) return false;
    setConfirmingId(match.sessionId);
    const newStatus = statusForMatch(match);
    try {
      await base44.entities.TrainingPlanSession.update(match.scheduledWorkoutId, { status: newStatus });
      await base44.entities.WorkoutSession.update(match.sessionId, {
        training_plan_session_id: match.scheduledWorkoutId,
      });
      setLastConfirmed(match.sessionId);
      if (newStatus === 'partial' || newStatus === 'excess') void triggerReplan(match.scheduledWorkoutId);
      await load();
      return true;
    } catch (e) {
      setError(e?.message || 'Failed to confirm match');
      return false;
    } finally {
      setConfirmingId(null);
    }
  }, [confirmingId, load, triggerReplan]);

  // Acknowledge an auto-link — no DB write (already linked); just dismiss from the verify queue.
  const confirmAutoLink = useCallback((match) => {
    setLastConfirmed(match.sessionId);
    setAutoLinked((prev) => prev.filter((m) => m.sessionId !== match.sessionId));
  }, []);

  // Reject an auto-link — unlink the workout and reset the plan session to pending.
  const rejectAutoLink = useCallback(async (match) => {
    if (!match || rejectingId) return false;
    setRejectingId(match.sessionId);
    try {
      await base44.entities.WorkoutSession.update(match.sessionId, { training_plan_session_id: null });
      await base44.entities.TrainingPlanSession.update(match.scheduledWorkoutId, { status: 'pending' });
      setLastRejected(match.sessionId);
      setAutoLinked((prev) => prev.filter((m) => m.sessionId !== match.sessionId));
      await load();
      return true;
    } catch (e) {
      setError(e?.message || 'Failed to unlink match');
      return false;
    } finally {
      setRejectingId(null);
    }
  }, [rejectingId, load]);

  const markSkipped = useCallback(async (sessionId) => {
    if (!sessionId || skippingId) return false;
    setSkippingId(sessionId);
    try {
      await base44.entities.TrainingPlanSession.update(sessionId, { status: 'skipped' });
      setLastSkipped(sessionId);
      setOverdue((prev) => prev.filter((s) => s.id !== sessionId));
      setTodaySessions((prev) => prev.filter((s) => s.id !== sessionId));
      void triggerReplan(sessionId);
      return true;
    } catch (e) {
      setError(e?.message || 'Failed to mark session as skipped');
      return false;
    } finally {
      setSkippingId(null);
    }
  }, [skippingId, triggerReplan]);

  // Quick "mark off" for today's planned sessions — marks the plan session completed
  // without linking an uploaded activity (user did the session, no file needed).
  const markCompleted = useCallback(async (sessionId) => {
    if (!sessionId || markingId) return false;
    setMarkingId(sessionId);
    try {
      await base44.entities.TrainingPlanSession.update(sessionId, { status: 'completed' });
      setLastMarkedDone(sessionId);
      setTodaySessions((prev) => prev.filter((s) => s.id !== sessionId));
      return true;
    } catch (e) {
      setError(e?.message || 'Failed to mark session as complete');
      return false;
    } finally {
      setMarkingId(null);
    }
  }, [markingId]);

  return {
    matches,
    autoLinked,
    overdue,
    todaySessions,
    loading,
    error,
    confirmMatch,
    confirmAutoLink,
    rejectAutoLink,
    markSkipped,
    markCompleted,
    confirmingId,
    rejectingId,
    skippingId,
    markingId,
    lastConfirmed,
    lastRejected,
    lastSkipped,
    lastMarkedDone,
    adjustingId,
    lastAdjustment,
    autoLinkedCount: autoLinked.length,
    refresh: load,
  };
}