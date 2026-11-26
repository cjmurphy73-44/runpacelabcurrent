import { useEffect, useState, useCallback } from 'react';
import { useServices } from '@/services/providers/ServiceContext';
import { useSubscription } from '@/hooks/useSubscription';
import moment from 'moment';

export function usePlannedActualReconciliation(athleteId, activePlanId, onScheduleChanged) {
  const { functionGateway } = useServices();
  const { isPro } = useSubscription();
  const [matches, setMatches] = useState([]);
  const [overdue, setOverdue] = useState([]);
  const [todaySessions, setTodaySessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(null);
  const [linkedWorkoutId, setLinkedWorkoutId] = useState(null);
  const [lastAdjustment, setLastAdjustment] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = activePlanId ? await functionGateway.invoke('reconcilePlannedWorkout', {
        plan_id: activePlanId, action: 'suggest', today: moment().format('YYYY-MM-DD'),
      }) : null;
      setMatches(response?.data?.matches ?? []);
      setTodaySessions(response?.data?.todaySessions ?? []);
      setOverdue(response?.data?.overdue ?? []);
    } catch (err) {
      setError(err?.response?.data?.error || 'Could not load matches for your active plan.');
    } finally {
      setLoading(false);
    }
  }, [activePlanId, functionGateway]);

  useEffect(() => {
    setError(null);
    setLinkedWorkoutId(null);
    void load();
  }, [load]);

  const update = async (action, sessionId, workoutId?) => {
    if (!activePlanId || pending) return;
    setPending({ action, sessionId, workoutId });
    setError(null);
    try {
      const { data } = await functionGateway.invoke('reconcilePlannedWorkout', {
        plan_id: activePlanId, action, session_id: sessionId,
        ...(workoutId ? { workout_id: workoutId } : {}),
      });
      if (!data?.success) throw new Error('Schedule update was not confirmed.');
      if (workoutId) setLinkedWorkoutId(workoutId);
      void onScheduleChanged?.(athleteId);
      await load();
      if (isPro && ['partial', 'excess', 'skipped'].includes(data.status)) {
        void functionGateway.invoke('autoReplanOnDeviation', { session_id: sessionId }).then(
          result => setLastAdjustment(result?.data?.summary || 'Review your plan for any saved adjustments.'),
          () => setLastAdjustment('The coach adjustment could not be confirmed. Review your saved plan.'),
        );
      }
    } catch (err) {
      setError(err?.response?.data?.error || 'Could not confirm the update. Refresh and retry the same selection.');
      await load();
    } finally {
      setPending(null);
    }
  };

  return { matches, overdue, todaySessions, loading, error, pending, linkedWorkoutId, lastAdjustment, update };
}
