import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { assertOwnsAthlete } from '../../shared/ownership.ts';
import { validateReconciliationPreflight } from '../../shared/reconciliationPreflight.ts';

// Read-only preflight. Do NOT add sequential update calls here: Base44 entity
// read-then-update is not an atomic compare-and-swap. The durable commit remains
// disabled until a transactional/conditional-write primitive is verified.
Deno.serve(async (req: Request) => {
  try {
    if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const { athlete_id, plan_session_id, workout_session_id } = body;
    if (![athlete_id, plan_session_id, workout_session_id].every(v => typeof v === 'string' && v.trim().length > 0)) {
      return Response.json({ error: 'athlete_id, plan_session_id and workout_session_id are required' }, { status: 400 });
    }
    if (!(await assertOwnsAthlete(base44, user, athlete_id))) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    const [plan, workout, linked] = await Promise.all([
      base44.entities.TrainingPlanSession.get(plan_session_id),
      base44.entities.WorkoutSession.get(workout_session_id),
      base44.entities.WorkoutSession.filter({ athlete_id, training_plan_session_id: plan_session_id }, '-date', 2),
    ]);
    const check = validateReconciliationPreflight(athlete_id, plan, workout, linked);
    if (!check.ok) return Response.json({ eligible: false, reason: check.reason, committed: false }, { status: 409 });
    return Response.json({
      eligible: true, proposed_status: check.status, committed: false,
      reason: 'preflight_only_no_atomic_commit',
    });
  } catch {
    return Response.json({ eligible: false, committed: false, error: 'Unable to verify workout match' }, { status: 503 });
  }
});
