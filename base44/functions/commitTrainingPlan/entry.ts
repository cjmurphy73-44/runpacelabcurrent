import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { commitDraftPlan } from '../../shared/commitDraftPlan.ts';
import { getAuthorizedAthlete, isRecordId } from '../../shared/ownership.ts';
import { reportError } from '../../shared/errorReport.ts';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  try {
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { plan_id } = (await req.json().catch(() => null)) ?? {};
    if (!isRecordId(plan_id)) return Response.json({ error: 'plan_id is required' }, { status: 400 });

    const plan = await base44.asServiceRole.entities.TrainingPlan.get(plan_id).catch(() => null);
    const athlete = plan && await getAuthorizedAthlete(base44, user, plan.athlete_id);
    if (!athlete) return Response.json({ error: 'Plan not found' }, { status: 404 });
    if (plan.status !== 'draft') return Response.json({ error: 'Plan is not a draft' }, { status: 400 });

    return await commitDraftPlan(base44.asServiceRole, plan, athlete.created_by_id);
  } catch (error) {
    try { await reportError(base44, { source: 'commitTrainingPlan', message: error.message, stack: error.stack, severity: 'High' }); } catch {}
    return Response.json({ error: 'Could not activate training plan' }, { status: 500 });
  }
});
