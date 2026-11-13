import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { prepareDraftPlanCommit } from '../../shared/planCommitPreparation.ts';
import { reportError } from '../../shared/errorReport.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { plan_id } = await req.json();
    if (!plan_id) return Response.json({ error: 'plan_id is required' }, { status: 400 });

    const plan = await base44.entities.TrainingPlan.get(plan_id);
    if (!plan) return Response.json({ error: 'Plan not found' }, { status: 404 });
    if (plan.status !== 'draft') return Response.json({ error: 'Plan is not a draft' }, { status: 400 });

    const athleteId = plan.athlete_id;

    // Validate and prepare the replacement BEFORE archiving/deleting any
    // currently scheduled training. A malformed draft must leave the active
    // calendar unchanged.
    const prepared = prepareDraftPlanCommit(plan);
    if (!prepared.valid) {
      return Response.json({
        error: 'Plan structure is invalid. Please regenerate your plan.',
        validation_errors: prepared.errors,
      }, { status: 422 });
    }

    // Only after successful validation may existing plan/calendar records change.
    const oldActive = await base44.entities.TrainingPlan.filter({ athlete_id: athleteId, status: 'active' });
    if (oldActive.length > 0) {
      await base44.entities.TrainingPlan.bulkUpdate(oldActive.map((p) => ({ id: p.id, status: 'archived' })));
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().slice(0, 10);
    const oldPending = await base44.entities.TrainingPlanSession.filter({ athlete_id: athleteId, status: 'pending' });
    const toDelete = oldPending.filter((session) => session.date >= todayStr);
    await Promise.all(toDelete.map((session) => base44.entities.TrainingPlanSession.delete(session.id)));

    if (prepared.sessions.length > 0) {
      await base44.entities.TrainingPlanSession.bulkCreate(prepared.sessions);
    }

    const updatedPlan = await base44.entities.TrainingPlan.update(plan.id, { status: 'active' });

    return Response.json({ success: true, training_plan: updatedPlan });
  } catch (error) {
    try { await reportError(base44, { source: 'commitTrainingPlan', message: error.message, stack: error.stack, severity: 'High' }); } catch {}
    return Response.json({ error: error.message }, { status: 500 });
  }
});