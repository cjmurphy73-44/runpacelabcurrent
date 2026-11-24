import { prepareDraftPlanCommit } from './planCommitPreparation.ts';

function samePrescription(saved: any, expected: any) {
  return Object.entries(expected).every(([key, value]) => (saved[key] ?? '') === value);
}

export async function commitDraftPlan(base44: any, plan: any, ownerId?: string) {
  const prepared = prepareDraftPlanCommit(plan);
  if (!prepared.valid) {
    return Response.json({
      error: 'Plan structure is invalid. Please regenerate your plan.',
      validation_errors: prepared.errors,
    }, { status: 422 });
  }
  const plans = base44.entities.TrainingPlan;
  const sessions = base44.entities.TrainingPlanSession;
  const scope = { athlete_id: plan.athlete_id, training_plan_id: plan.id };
  // Create and confirm the replacement schedule before changing the active plan.
  // Recover an interrupted write by matching its persisted prescriptions.
  const existing = await sessions.filter(scope, 'date', prepared.sessions.length + 1);
  const toCreate = [...prepared.sessions];
  for (const row of existing) {
    const index = toCreate.findIndex(candidate => samePrescription(row, candidate));
    if (index === -1) return Response.json({ error: 'The draft schedule conflicts with saved sessions.' }, { status: 409 });
    toCreate.splice(index, 1);
  }
  if (toCreate.length) {
    try { await sessions.bulkCreate(ownerId ? toCreate.map(row => ({ ...row, created_by_id: ownerId })) : toCreate); } catch { /* reconcile an uncertain batch */ }
  }
  const saved = await sessions.filter(scope, 'date', prepared.sessions.length + 1);
  const expected = [...prepared.sessions];
  for (const row of saved) {
    const index = expected.findIndex(candidate => samePrescription(row, candidate));
    if (index === -1) return Response.json({ error: 'The draft schedule could not be confirmed.' }, { status: 409 });
    expected.splice(index, 1);
  }
  if (expected.length) return Response.json({ error: 'The draft schedule could not be confirmed. Retry activation.' }, { status: 502 });

  const oldActive = await plans.filter({ athlete_id: plan.athlete_id, status: 'active' });
  const oldIds = oldActive.filter(row => row.id !== plan.id).map(row => row.id);
  let active;
  try {
    active = await plans.update(plan.id, { status: 'active' });
  } catch {
    active = await plans.get(plan.id).catch(() => null);
  }
  if (active?.status !== 'active') {
    return Response.json({ error: 'Activation could not be confirmed. Your previous plan is still available.' }, { status: 502 });
  }

  let previous_schedule_retired = true;
  // Until retirement succeeds the replacement is already saved. Report success
  // with a cleanup status rather than inviting a duplicate activation.
  if (oldIds.length) {
    try {
      await plans.bulkUpdate(oldIds.map(id => ({ id, status: 'archived' })));
      const retired = await Promise.all(oldIds.map(id => plans.get(id)));
      if (retired.some(row => row?.status !== 'archived')) throw new Error('Plan retirement not confirmed');
      const oldPending = await sessions.filter({ athlete_id: plan.athlete_id, status: 'pending', training_plan_id: { $in: oldIds } });
      const today = new Date().toISOString().slice(0, 10);
      await Promise.all(oldPending.filter(row => row.date >= today).map(row => sessions.delete(row.id)));
    } catch {
      previous_schedule_retired = false;
    }
  }
  return Response.json({ success: true, training_plan: active, previous_schedule_retired });
}
