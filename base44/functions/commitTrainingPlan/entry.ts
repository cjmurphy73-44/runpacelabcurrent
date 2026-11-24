import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { commitDraftPlan } from '../../shared/commitDraftPlan.ts';
import { reportError } from '../../shared/errorReport.ts';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  try {
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { plan_id } = await req.json();
    if (!plan_id) return Response.json({ error: 'plan_id is required' }, { status: 400 });

    const plan = await base44.entities.TrainingPlan.get(plan_id);
    if (!plan) return Response.json({ error: 'Plan not found' }, { status: 404 });
    if (plan.status !== 'draft') return Response.json({ error: 'Plan is not a draft' }, { status: 400 });

    if (plan.created_by_id !== user.id && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    return await commitDraftPlan(base44, plan);
  } catch (error) {
    try { await reportError(base44, { source: 'commitTrainingPlan', message: error.message, stack: error.stack, severity: 'High' }); } catch {}
    return Response.json({ error: error.message }, { status: 500 });
  }
});