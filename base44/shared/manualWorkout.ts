import { assertOwnsAthlete } from './ownership.ts';
import { isWorkoutSport } from './workoutSports.ts';
import { recomputeCTLATLTSB } from './ctlRecalc.ts';

// Keep persistence and the derived training-load refresh separate. Once a workout
// has been saved a calculation failure must never tell the athlete to save again.
export async function logManualWorkout(base44: any, request: Request) {
  const user = await base44.auth.me().catch(() => null);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const input = await request.json().catch(() => null);
  const { athlete_id, date, sport, duration_minutes, distance_km, rpe } = input ?? {};
  const dateMs = typeof date === 'string' ? Date.parse(date + 'T00:00:00Z') : NaN;
  if (typeof athlete_id !== 'string' || !athlete_id.trim() || !isWorkoutSport(sport) ||
    !Number.isFinite(dateMs) || new Date(dateMs).toISOString().slice(0, 10) !== date ||
    dateMs > Date.now() + 86_400_000 ||
    !Number.isFinite(duration_minutes) || duration_minutes < 1 / 60 || duration_minutes > 1440 ||
    (distance_km != null && (!Number.isFinite(distance_km) || distance_km < 0)) ||
    !Number.isInteger(rpe) || rpe < 1 || rpe > 10) {
    return Response.json({ error: 'Enter a valid workout date, sport, duration, distance and effort.' }, { status: 400 });
  }
  if (!(await assertOwnsAthlete(base44, user, athlete_id))) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  let workout;
  try {
    workout = await base44.entities.WorkoutSession.create({
      athlete_id, date, sport, duration_minutes, duration_seconds: Math.round(duration_minutes * 60),
      ...(distance_km == null ? {} : { distance_km }),
      // Keep the legacy source enum and RPE-load convention during rollout.
      source_format: 'csv', session_trimp: 0, session_tss: Math.round(duration_minutes * rpe * 0.6),
    });
    if (!workout?.id) throw new Error('Workout write unconfirmed');
  } catch {
    return Response.json({ error: 'The workout save could not be confirmed. Check history before retrying.' }, { status: 502 });
  }

  let training_load_refreshed = false;
  try {
    const result = await recomputeCTLATLTSB(base44, athlete_id);
    training_load_refreshed = result.success;
  } catch {
    // A later recalculation can recover from the saved workout.
  }
  return Response.json({ success: true, workout_session: workout, training_load_refreshed });
}
