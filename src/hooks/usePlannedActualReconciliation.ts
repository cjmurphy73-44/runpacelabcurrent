// src/hooks/usePlannedActualReconciliation.ts
// Dashboard hook that loads an athlete's unlinked ingested sessions and pending
// scheduled plan sessions, runs the WorkoutMatchingEngine, and exposes a confirmMatch
// action that links an actual session to its scheduled item (TrainingPlanSession ->
// completed/modified, WorkoutSession -> training_plan_session_id) without ever
// touching training load.

import { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { workoutMatchingEngine } from '@/services/workoutMatchingEngine';

export function usePlannedActualReconciliation(athleteId) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmingId, setConfirmingId] = useState(null);
  const [lastConfirmed, setLastConfirmed] = useState(null);
  const [autoLinkedCount, setAutoLinkedCount] = useState(0);

  const load = useCallback(async () => {
    if (!athleteId) return;
    setLoading(true);
    setError(null);
    try {
      const [sessions, planned] = await Promise.all([
        base44.entities.WorkoutSession.filter({ athlete_id: athleteId }, '-date', 60),
        base44.entities.TrainingPlanSession.filter({ athlete_id: athleteId }, '-date', 200),
      ]);

      // Ingested = recent actuals not already linked to a plan session.
      const ingested = (sessions || [])
        .filter((s) => !s.training_plan_session_id)
        .map((s) => ({
          sessionId: s.id,
          date: s.date,
          sport: s.sport,
          durationMinutes: s.duration_minutes || 0,
          distanceKm: s.distance_km,
        }));

      // Candidates = pending scheduled sessions within a generous recent+near-future window.
      const today = new Date();
      const since = new Date(today); since.setDate(since.getDate() - 30);
      const until = new Date(today); until.setDate(until.getDate() + 7);
      const sinceKey = since.toISOString().split('T')[0];
      const untilKey = until.toISOString().split('T')[0];
      const candidates = (planned || [])
        .filter((p) => (!p.status || p.status === 'pending') && p.date >= sinceKey && p.date <= untilKey)
        .map((p) => ({
          id: p.id,
          date: p.date,
          sport: p.sport,
          targetDurationMinutes: p.prescribed_duration_minutes,
          targetDistanceKm: undefined,
          status: p.status,
        }));

      const all = workoutMatchingEngine.matchAll(ingested, candidates).filter((m) => m.matchStatus !== 'UNMATCHED');

      // Auto-link high-confidence exact matches so completed sessions are marked off without
      // a manual step. Each scheduled item is only auto-linked once per pass (deduped), and any
      // write failure falls back to the manual review list. On the next load the auto-linked rows
      // are gone from both pools (plan session no longer pending / workout now linked), so this
      // pass is self-limiting — no re-entrancy loop.
      const AUTO_CONFIDENCE = 0.9;
      const linkedScheduled = new Set();
      const autoLinked = [];
      const reviewable = [];
      for (const m of all) {
        const canAuto = m.matchStatus === 'EXACT' && m.confidenceScore >= AUTO_CONFIDENCE && !linkedScheduled.has(m.scheduledWorkoutId);
        if (!canAuto) { reviewable.push(m); continue; }
        try {
          await base44.entities.TrainingPlanSession.update(m.scheduledWorkoutId, { status: 'completed' });
          await base44.entities.WorkoutSession.update(m.sessionId, { training_plan_session_id: m.scheduledWorkoutId });
          linkedScheduled.add(m.scheduledWorkoutId);
          autoLinked.push(m.sessionId);
        } catch {
          reviewable.push(m);
        }
      }

      setMatches(reviewable);
      setAutoLinkedCount(autoLinked.length);
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
      // EXACT -> completed; lagging/overshooting the plan -> modified.
      const newStatus = match.matchStatus === 'EXACT' ? 'completed' : 'modified';
      await base44.entities.TrainingPlanSession.update(match.scheduledWorkoutId, { status: newStatus });
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

  return { matches, loading, error, confirmMatch, confirmingId, lastConfirmed, autoLinkedCount, refresh: load };
}