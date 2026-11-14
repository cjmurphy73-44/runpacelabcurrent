// Source-only, deterministic checks for the server-side planned/actual linking gate.
// This is a preflight, NOT a transactional commit or a lock.
export type ReconciliationPreflight = {
  ok: boolean;
  reason: string;
  status?: 'completed' | 'partial' | 'excess';
};
const fail = (reason: string): ReconciliationPreflight => ({ ok: false, reason });
const id = (value: unknown) => typeof value === 'string' && value.trim().length > 0;
export function validateReconciliationPreflight(
  athleteId: string,
  plan: any,
  workout: any,
  workoutsLinkedToPlan: any[],
  plannedMinutes?: number,
): ReconciliationPreflight {
  if (!id(athleteId) || !plan || !workout ||
      !id(plan.id) || !id(workout.id) ||
      plan.athlete_id !== athleteId || workout.athlete_id !== athleteId) return fail('scope_mismatch');
  if (plan.status !== 'pending') return fail('plan_not_pending');
  if (workout.training_plan_session_id) return fail('workout_already_linked');
  if (!Array.isArray(workoutsLinkedToPlan)) return fail('linked_query_unverified');
  if (workoutsLinkedToPlan.length > 0) return fail('plan_already_linked');
  if (!id(plan.date) || plan.date !== workout.date) return fail('date_mismatch');
  if (!id(plan.sport) || plan.sport !== workout.sport) return fail('sport_mismatch');
  const prescribed = plannedMinutes ?? plan.prescribed_duration_minutes;
  const actual = workout.duration_minutes;
  if (!Number.isFinite(prescribed) || prescribed <= 0 ||
      !Number.isFinite(actual) || actual < 0) return fail('duration_unverified');
  const ratio = actual / prescribed;
  return {
    ok: true,
    reason: 'preflight_only_no_commit',
    status: ratio < 0.95 ? 'partial' : ratio > 1.05 ? 'excess' : 'completed',
  };
}
