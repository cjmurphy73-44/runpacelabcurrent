import { isRecordId } from './ownership.ts';

const DAY = 86_400_000;
const COMPLETION_STATUSES = ['completed', 'partial', 'excess'];
const WORKOUT_FIELDS = ['id', 'date', 'sport', 'duration_minutes', 'duration_seconds', 'training_plan_session_id'];
const PLAN_FIELDS = ['id', 'date', 'sport', 'status', 'prescribed_duration_minutes', 'prescribed_intensity_zone', 'completed_workout_id'];

function dayNumber(date: unknown) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return NaN;
  const parsed = Date.parse(date + 'T00:00:00Z');
  return Number.isFinite(parsed) && new Date(parsed).toISOString().slice(0, 10) === date ? parsed : NaN;
}

function dateKey(value: number) {
  return new Date(value).toISOString().slice(0, 10);
}

export function comparePlannedWorkout(workout, session) {
  const planned = Number(session.prescribed_duration_minutes);
  const recorded = Number(workout.duration_seconds) > 0 ? Number(workout.duration_seconds) / 60 : Number(workout.duration_minutes);
  const dayOffset = (dayNumber(workout.date) - dayNumber(session.date)) / DAY;
  const ratio = recorded / planned;
  if (!workout.sport || workout.sport !== session.sport || !Number.isFinite(dayOffset) || Math.abs(dayOffset) > 1 ||
    !(planned > 0) || !Number.isFinite(ratio) || ratio < 0.5 || ratio > 1.5) return null;
  const status = ratio < 0.95 ? 'partial' : ratio > 1.05 ? 'excess' : 'completed';
  const matchStatus = ratio < 0.8 || ratio > 1.2 ? 'PLAUSIBLE'
    : status === 'partial' ? 'COMPLETED_SHORT' : status === 'excess' ? 'COMPLETED_EXCEEDED' : 'EXACT';
  return {
    sessionId: workout.id, scheduledWorkoutId: session.id, matchStatus, status,
    scheduled: { date: session.date, sport: session.sport, targetDurationMinutes: planned },
    recordedMinutes: recorded,
    varianceDetails: { dayOffset, completionRatio: ratio, durationVariancePercent: Math.round((ratio - 1) * 100) },
  };
}

function reply(data, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } });
}

function reject(error: string, status: number) {
  return reply({ error }, status);
}

export async function reconcilePlannedWorkout(base44, request: Request) {
  const user = await base44.auth.me().catch(() => null);
  if (!user?.id) return reject('Unauthorized', 401);
  const input = await request.json().catch(() => null);
  if (!isRecordId(input?.plan_id) || !['suggest', 'link', 'complete', 'skip'].includes(input.action)) {
    return reject('An active plan and a valid action are required.', 400);
  }
  const entities = base44.asServiceRole.entities;
  try {
    const plan = await base44.entities.TrainingPlan.get(input.plan_id).catch(() => null);
    const athlete = plan && await entities.AthleteProfile.get(plan.athlete_id).catch(() => null);
    if (!athlete || athlete.created_by_id !== user.id) return reject('Plan not found', 404);
    if (plan.status !== 'active') return reject('This plan is no longer active.', 409);
    if (input.action === 'suggest') return await suggestMatches(entities, plan, input.today);
    if (!isRecordId(input.session_id)) return reject('A plan session is required.', 400);
    const session = await base44.entities.TrainingPlanSession.get(input.session_id).catch(() => null);
    if (!session || session.athlete_id !== athlete.id || session.training_plan_id !== plan.id) {
      return reject('Plan session not found', 404);
    }
    if (input.action === 'link') {
      if (!isRecordId(input.workout_id)) return reject('A workout is required.', 400);
      const workout = await base44.entities.WorkoutSession.get(input.workout_id).catch(() => null);
      if (!workout || workout.athlete_id !== athlete.id) return reject('Workout not found', 404);
      return await linkWorkout(entities, session, workout);
    }
    const status = input.action === 'skip' ? 'skipped' : 'completed';
    if (session.status === status && !session.completed_workout_id) return reply({ success: true, status });
    if (session.status !== 'pending' || session.completed_workout_id) return reject('This session already has a result.', 409);
    const selector = sessionSelector(session);
    await entities.TrainingPlanSession.updateMany({
      ...selector, status: 'pending', completed_workout_id: null,
    }, { $set: { status } });
    const saved = await entities.TrainingPlanSession.get(session.id);
    if (saved.status !== status || saved.completed_workout_id) return reject('This session changed. Refresh your plan.', 409);
    return reply({ success: true, status });
  } catch {
    return reject('Could not confirm the schedule update. Refresh and retry the same selection.', 502);
  }
}

async function suggestMatches(entities, plan, inputDate) {
  const utcToday = dayNumber(dateKey(Date.now()));
  const requestedDay = dayNumber(inputDate);
  const today = Math.abs(requestedDay - utcToday) <= DAY ? requestedDay : utcToday;
  const recent = dateKey(today - 30 * DAY);
  const before = dateKey(today + DAY);
  const [scheduled, workouts] = await Promise.all([
    entities.TrainingPlanSession.filter({
      athlete_id: plan.athlete_id, training_plan_id: plan.id, status: 'pending',
      date: { $gte: recent, $lte: before },
    }, '-date', 200, 0, PLAN_FIELDS),
    entities.WorkoutSession.filter({
      athlete_id: plan.athlete_id, date: { $gte: recent, $lte: before },
    }, '-date', 60, 0, WORKOUT_FIELDS),
  ]);
  const matches = workouts.flatMap(workout => scheduled
    .filter(session => (!workout.training_plan_session_id || workout.training_plan_session_id === session.id) &&
      (!session.completed_workout_id || session.completed_workout_id === workout.id))
    .map(session => comparePlannedWorkout(workout, session))
    .filter(match => match !== null)
    .sort((a, b) => Math.abs(a.varianceDetails.dayOffset) - Math.abs(b.varianceDetails.dayOffset) ||
      Math.abs(a.varianceDetails.completionRatio - 1) - Math.abs(b.varianceDetails.completionRatio - 1))
    .slice(0, 3));
  const matched = new Set(matches.map(match => match.scheduledWorkoutId));
  const remaining = scheduled.filter(session => !matched.has(session.id) && !session.completed_workout_id);
  return reply({
    matches,
    todaySessions: remaining.filter(session => session.date === dateKey(today)),
    overdue: remaining.filter(session => session.date < dateKey(today) && session.date >= dateKey(today - 7 * DAY)),
  });
}

function sessionSelector(session) {
  return { id: session.id, athlete_id: session.athlete_id, training_plan_id: session.training_plan_id };
}

async function linkWorkout(entities, session, workout) {
  const sessionStore = entities.TrainingPlanSession;
  const workoutStore = entities.WorkoutSession;
  const selector = sessionSelector(session);
  if (workout.training_plan_session_id === session.id && session.completed_workout_id === workout.id &&
    COMPLETION_STATUSES.includes(session.status)) return reply({ success: true, status: session.status });
  if (session.status !== 'pending' ||
    (session.completed_workout_id && session.completed_workout_id !== workout.id) ||
    (workout.training_plan_session_id && workout.training_plan_session_id !== session.id)) {
    return reject('This workout or plan session already has a different result.', 409);
  }
  const comparison = comparePlannedWorkout(workout, session);
  if (!comparison) return reject('Choose a session with a matching sport, date and duration.', 422);
  // A conditional update reserves one workout per planned session across workers.
  // Once reserved, only that pair can finish a retry. The workout side is also
  // conditional so the same workout cannot complete two plan sessions.
  if (!session.completed_workout_id) await sessionStore.updateMany({
    ...selector, status: 'pending', completed_workout_id: null,
  }, { $set: { completed_workout_id: workout.id } });
  const reservation = await sessionStore.get(session.id);
  if (reservation.completed_workout_id !== workout.id || reservation.status !== 'pending') {
    return reject('This plan session changed. Refresh your plan.', 409);
  }
  if (!workout.training_plan_session_id) await workoutStore.updateMany({
    id: workout.id, athlete_id: workout.athlete_id, training_plan_session_id: null,
  }, { $set: { training_plan_session_id: session.id } });
  const linked = await workoutStore.get(workout.id);
  if (linked.training_plan_session_id !== session.id) {
    if (linked.training_plan_session_id) {
      await sessionStore.updateMany({ ...selector, status: 'pending', completed_workout_id: workout.id }, { $unset: { completed_workout_id: '' } });
      return reject('This workout was already linked to another session.', 409);
    }
    return reject('The link could not be confirmed. Retry this workout and session.', 502);
  }
  await sessionStore.updateMany({
    ...selector, status: 'pending', completed_workout_id: workout.id,
  }, { $set: { status: comparison.status } });
  const saved = await sessionStore.get(session.id);
  if (saved.completed_workout_id !== workout.id || saved.status !== comparison.status) {
    return reject('The link was saved. Retry to finish marking the plan session.', 502);
  }
  return reply({ success: true, status: saved.status });
}
