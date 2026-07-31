import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

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

    // Archive any currently active plans for this athlete
    const oldActive = await base44.entities.TrainingPlan.filter({ athlete_id: athleteId, status: 'active' });
    if (oldActive.length > 0) {
      await base44.entities.TrainingPlan.bulkUpdate(oldActive.map((p) => ({ id: p.id, status: 'archived' })));
    }

    // Clear old upcoming pending sessions to avoid duplicates/conflicts with the new plan
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().slice(0, 10);
    const oldPending = await base44.entities.TrainingPlanSession.filter({ athlete_id: athleteId, status: 'pending' });
    const toDelete = oldPending.filter((s) => s.date >= todayStr);
    await Promise.all(toDelete.map((s) => base44.entities.TrainingPlanSession.delete(s.id)));

    // Materialize TrainingPlanSession records so the calendar reflects the new plan
    const sessionsToCreate = [];
    for (const week of plan.weekly_plans || []) {
      for (const day of week.days || []) {
        if (!day.date || day.session_type === 'rest') continue;
        sessionsToCreate.push({
          training_plan_id: plan.id,
          athlete_id: athleteId,
          date: day.date,
          sport: day.sport || 'running',
          prescribed_duration_minutes: day.prescribed_duration_minutes || 0,
          prescribed_intensity_zone: day.prescribed_intensity_zone || '',
          rationale_text: `${day.title || ''}${day.description ? ' — ' + day.description : ''}`,
          status: 'pending',
        });
      }
    }
    if (sessionsToCreate.length > 0) {
      await base44.entities.TrainingPlanSession.bulkCreate(sessionsToCreate);
    }

    const updatedPlan = await base44.entities.TrainingPlan.update(plan.id, { status: 'active' });

    return Response.json({ success: true, training_plan: updatedPlan });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});