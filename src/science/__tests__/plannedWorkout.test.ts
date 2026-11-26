import { describe, expect, it, vi } from 'vitest';
import { comparePlannedWorkout, reconcilePlannedWorkout } from '../../../base44/shared/plannedWorkout';

function fixture() {
  const athlete = { id: 'athlete-a', created_by_id: 'owner' };
  const plan = { id: 'plan-a', athlete_id: athlete.id, status: 'active' };
  const session = {
    id: 'session-a', athlete_id: athlete.id, training_plan_id: plan.id,
    date: '2026-11-24', sport: 'running', status: 'pending', prescribed_duration_minutes: 60,
    completed_workout_id: null,
  };
  const workout = {
    id: 'workout-a', athlete_id: athlete.id, date: session.date, sport: 'running', duration_minutes: 55,
    training_plan_session_id: null,
  };
  const mutate = (row) => vi.fn(async (query, mutation) => {
    if (Object.entries(query).every(([key, value]) => (row[key] ?? null) === value)) Object.assign(row, mutation.$set);
  });
  const entities = {
    AthleteProfile: { get: async () => athlete },
    TrainingPlan: { get: async () => plan },
    TrainingPlanSession: { get: async () => ({ ...session }), updateMany: mutate(session) },
    WorkoutSession: { get: async () => ({ ...workout }), updateMany: mutate(workout) },
  };
  return { session, workout, entities, client: (id = 'owner') => ({ auth: { me: async () => ({ id }) }, asServiceRole: { entities }, entities }) };
}

function request() {
  return new Request('https://app.test', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'link', plan_id: 'plan-a', session_id: 'session-a', workout_id: 'workout-a' }),
  });
}

describe('confirming which workout completed a plan session', () => {
  it('uses sport, calendar day and recorded duration to classify the result', () => {
    const { session, workout } = fixture();
    expect(comparePlannedWorkout(workout, session)).toMatchObject({ status: 'partial' });
    expect(comparePlannedWorkout({ ...workout, duration_seconds: 3600 }, session)).toMatchObject({ status: 'completed' });
    expect(comparePlannedWorkout({ ...workout, duration_minutes: 30 }, session)).toMatchObject({ status: 'partial', matchStatus: 'PLAUSIBLE' });
    expect(comparePlannedWorkout({ ...workout, sport: 'cycling' }, session)).toBeNull();
    expect(comparePlannedWorkout({ ...workout, date: 'unknown' }, session)).toBeNull();
  });

  it('keeps the same file and session linked when an interrupted confirmation is replayed', async () => {
    const { client, entities, session, workout } = fixture();
    entities.WorkoutSession.updateMany.mockRejectedValueOnce(new Error('temporary link failure'));
    expect((await reconcilePlannedWorkout(client(), request())).status).toBe(502);
    expect(session).toMatchObject({ completed_workout_id: workout.id, status: 'pending' });
    expect(workout.training_plan_session_id).toBeNull();
    expect((await reconcilePlannedWorkout(client(), request())).status).toBe(200);
    expect(session.status).toBe('partial');
    expect(workout.training_plan_session_id).toBe(session.id);
    expect((await reconcilePlannedWorkout(client(), request())).status).toBe(200);
    expect(entities.TrainingPlanSession.updateMany).toHaveBeenCalledTimes(2);
  });

  it('blocks another athlete or a conflicting workout without writing', async () => {
    const { client, entities, session } = fixture();
    expect((await reconcilePlannedWorkout(client('control'), request())).status).toBe(404);
    session.completed_workout_id = 'another-workout';
    expect((await reconcilePlannedWorkout(client(), request())).status).toBe(409);
    expect(entities.WorkoutSession.updateMany).not.toHaveBeenCalled();
    expect(entities.TrainingPlanSession.updateMany).not.toHaveBeenCalled();
  });
});
