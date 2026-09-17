// base44/functions/postWorkoutAIEvaluation/entry.ts
// Authed HTTP wrapper around the shared runPostWorkoutEvaluation logic.
// ActivityDetail retries call this with the user's app token; the external-webhook
// path calls runPostWorkoutEvaluation() directly via the shared module.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { runPostWorkoutEvaluation } from '../../shared/postWorkoutAI.ts';
import { assertOwnsAthlete } from '../../shared/ownership.ts';

export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { workout_id, athlete_id } = await req.json().catch(() => ({}));
    if (!workout_id || !athlete_id) {
      return Response.json({ error: 'workout_id and athlete_id are required' }, { status: 400 });
    }

    if (!(await assertOwnsAthlete(base44, user, athlete_id))) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const result = await runPostWorkoutEvaluation(base44, workout_id, athlete_id);
    return Response.json(result, { headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return Response.json({ error: error.message || 'Evaluation failed' }, { status: 500 });
  }
}