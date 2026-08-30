// src/hooks/usePlannedActualReconciliation.ts
// Loads an athlete's unlinked ingested sessions and pending scheduled plan sessions,
// runs the WorkoutMatchingEngine, auto-links high-confidence matches, and exposes:
//  - reviewable matches (lower confidence) for manual confirm
//  - auto-linked matches pending user verification (confirm / reject-unlink)
//  - overdue planned sessions (pending + date passed + no linked workout) for skip
// confirmMatch / rejectAutoLink / markSkipped mutate the plan session status and the
// workout link. Completion outcome is split into completed / partial / excess from the
// actual-to-prescribed duration ratio — `modified` is no longer written.

import { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { workoutMatchingEngine } from '@/services/workoutMatchingEngine';

const AUTO_CONFIDENCE = 0.9;

function todayKey() {
  return new Date().toISOString().split('T')[0];
}

function statusForMatch(match) {
  switch (match.matchStatus) {
    case 'EXACT': return 'completed';
    case 'COMPLETED_SHORT': return 'partial';
    case 'COMPLETED_EXCEEDED': return 'excess';
    default: return 'modified'; // legacy fallback, should not occur for matched rows
  }
}

export function usePlannedActualReconciliation(athleteId) {
  const [matches, setMatches] = useState([]);
  const [autoLinked, setAutoLinked] = useState([]); // pending user verification
  const [overdue, setOverdue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmingId, setConfirmingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [skippingId, setSkippingId] = useState(null);
  const [lastConfirmed, setLastConfirmed] = useState(null);
  const [lastRejected, setLastRejected] = useState(null);
  const [lastSkipped, setLastSkipped] = useState(null);

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

      // Overdue = pending (not auto-linked this pass, not previously completed) with date < today.
      const tK = tKey;
      const overdueRows = (planned || [])
        .filter((p) => (!p.status || p.status === 'pending') && p.date < tK)
        .filter((p) => !linkedScheduled.has(p.id))
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
    try {
      await base44.entities.TrainingPlanSession.update(match.scheduledWorkoutId, { status: statusForMatch(match) });
      await base44.entities.WorkoutSession.update(match.sessionId, {
        training_plan_session_id: match.scheduledWorkoutId,
      });
      setLastConfirmed(match.sessionId);
      await load();
      return true;
    } catch (e) {
      setError(e?.message || 'Failed to confirm match');
      return false;
    } finally {
      setConfirmingId(null);
    }
  }, [confirmingId, load]);

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
      return true;
    } catch (e) {
      setError(e?.message || 'Failed to mark session as skipped');
      return false;
    } finally {
      setSkippingId(null);
    }
  }, [skippingId]);

  return {
    matches,
    autoLinked,
    overdue,
    loading,
    error,
    confirmMatch,
    confirmAutoLink,
    rejectAutoLink,
    markSkipped,
    confirmingId,
    rejectingId,
    skippingId,
    lastConfirmed,
    lastRejected,
    lastSkipped,
    autoLinkedCount: autoLinked.length,
    refresh: load,
  };
}