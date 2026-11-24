import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { getAuthorizedAthlete, isRecordId } from '../../shared/ownership.ts';
import { assertPaidPlan } from '../../shared/planGate.ts';

const reviewed = 'admin_reviewed';
const active = { status: 'active', authorization_source: reviewed };
const missing = () => Response.json({ error: 'Record not found' }, { status: 404 });

Deno.serve(async (req: Request) => {
  const base44 = createClientFromRequest(req);
  try {
    const user = await base44.auth.me().catch(() => null);
    if (!user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const input = await req.json().catch(() => null);
    const entities = base44.asServiceRole.entities;
    const assignments = entities.CoachAthleteAssignment;
    const admin = user.role === 'admin';

    if (input?.action === 'assign') {
      // This operation records an administrator's review and athlete consent.
      if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 });
      const { athlete_id, coach_user_id } = input;
      if (!isRecordId(athlete_id) || !isRecordId(coach_user_id)) {
        return Response.json({ error: 'Athlete and coach IDs are required' }, { status: 400 });
      }
      const [athlete, coach] = await Promise.all([
        entities.AthleteProfile.get(athlete_id).catch(() => null),
        entities.User.get(coach_user_id).catch(() => null),
      ]);
      if (!athlete || !coach) return missing();
      const pair = { athlete_profile_id: athlete_id, coach_user_id };
      const rows = await assignments.filter(pair, '-created_date', 1);
      if (rows[0]) await assignments.update(rows[0].id, active);
      else await assignments.create({
        ...pair, ...active, athlete_name_snapshot: [athlete.first_name, athlete.last_name].filter(Boolean).join(' '),
      });
      return Response.json({ success: true });
    }

    if (input?.action === 'revoke' || input?.action === 'notes') {
      if (!isRecordId(input.assignment_id)) return Response.json({ error: 'Assignment ID is required' }, { status: 400 });
      const row = await assignments.get(input.assignment_id).catch(() => null);
      if (!row || (!admin && row.coach_user_id !== user.id)) return missing();
      if (input.action === 'notes') {
        if (row.status !== 'active' || row.authorization_source !== reviewed) return missing();
        if (typeof input.notes !== 'string' || input.notes.length > 2000) {
          return Response.json({ error: 'Invalid notes' }, { status: 400 });
        }
        await assignments.update(row.id, { notes: input.notes.trim() });
      } else {
        // Revoke every active grant for the pair, including any duplicate record.
        const pair = { athlete_profile_id: row.athlete_profile_id, coach_user_id: row.coach_user_id, status: 'active' };
        const matches = await assignments.filter(pair, 'id', 201);
        if (matches.length > 200) return Response.json({ error: 'Too many duplicate assignments to revoke' }, { status: 409 });
        if (matches.length) await assignments.bulkUpdate(matches.map(match => ({ id: match.id, status: 'archived' })));
      }
      return Response.json({ success: true });
    }

    if (input?.action !== 'list' && input?.action !== 'workout') {
      return Response.json({ error: 'Invalid roster action' }, { status: 400 });
    }
    const { plan } = await assertPaidPlan(base44, user);
    if (!admin && plan !== 'coach_pro' && plan !== 'team') {
      return Response.json({ error: 'The coach roster requires Coach Pro' }, { status: 402 });
    }

    if (input.action === 'workout') {
      if (!isRecordId(input.workout_id)) return Response.json({ error: 'Workout ID is required' }, { status: 400 });
      const workout = await entities.WorkoutSession.get(input.workout_id).catch(() => null);
      if (!workout || !(await getAuthorizedAthlete(base44, user, workout.athlete_id))) return missing();
      // Original download URLs remain accessible to the athlete only.
      const { raw_file_url: _raw, ...summary } = workout;
      const scope = { athlete_id: workout.athlete_id, workout_id: workout.id };
      const feedback = await entities.WorkoutFeedback.filter(scope, '-created_date', 1);
      return Response.json({ workout: summary, feedback: feedback[0] ?? null });
    }

    const rows = await assignments.filter(admin ? active : { ...active, coach_user_id: user.id }, '-created_date', 200);
    const profiles = Object.create(null);
    const workouts = Object.create(null);
    const plans = Object.create(null);
    const uniqueIds = [...new Set<string>(rows.map((row: any) => row.athlete_profile_id))];
    for (const id of uniqueIds) {
      const athlete = await getAuthorizedAthlete(base44, user, id);
      if (!athlete) continue;
      const { webhook_api_key: _key, ...profile } = athlete;
      profiles[id] = profile;
      const scope = { athlete_id: id };
      const [sessions, current] = await Promise.all([
        entities.WorkoutSession.filter(scope, '-date', 10, 0, ['id', 'date', 'duration_minutes', 'sport']),
        entities.TrainingPlan.filter({ ...scope, status: 'active' }, '-start_date', 1, 0, ['id', 'plan_title', 'status']),
      ]);
      workouts[id] = sessions;
      plans[id] = current[0];
    }
    return Response.json({ assignments: rows.filter(row => profiles[row.athlete_profile_id]), profiles, workouts, plans });
  } catch {
    return Response.json({ error: 'Could not complete coach roster request' }, { status: 500 });
  }
});
