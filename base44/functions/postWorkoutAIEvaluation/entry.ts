// base44/functions/postWorkoutAIEvaluation/entry.ts
// Authed HTTP wrapper around the shared runPostWorkoutEvaluation logic.
// ActivityDetail retries call this with the user's app token; the external-webhook
// path calls runPostWorkoutEvaluation() directly via the shared module.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { runPostWorkoutEvaluation } from '../../shared/postWorkoutAI.ts';
import { assertOwnsAthlete } from '../../shared/ownership.ts';

Deno.serve(async (req: Request) => {
  if (!req.headers.get('Authorization')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { athlete_id, workout_session_id } = body ?? {};
    const workout_id = body?.workout_id ?? workout_session_id;
    if (body?.workout_id && workout_session_id && body.workout_id !== workout_session_id) {
      return Response.json({ error: 'Conflicting workout IDs' }, { status: 400 });
    }
    if (typeof workout_id !== 'string' || !workout_id || typeof athlete_id !== 'string' || !athlete_id) {
      return Response.json({ error: 'workout_id and athlete_id are required' }, { status: 400 });
    }

    if (!(await assertOwnsAthlete(base44, user, athlete_id))) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify the workout belongs to this athlete before evaluating: runPostWorkoutEvaluation
    // fetches the session via asServiceRole (bypassing RLS) and links feedback onto it, so a
    // caller supplying another athlete's workout_id would otherwise mutate a victim's session.
    const workout = await base44.asServiceRole.entities.WorkoutSession.get(workout_id).catch(() => null);
    if (!workout || workout.athlete_id !== athlete_id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const result = await runPostWorkoutEvaluation(base44, workout_id, athlete_id);
    return Response.json(result, { headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return Response.json({ error: error.message || 'Evaluation failed' }, { status: 500 });
  }
});
