import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { getAuthorizedAthlete, isRecordId } from '../../shared/ownership.ts';
import { PLAN_SPORTS } from '../../shared/planValidation.ts';
import { readLimitedJson } from '../../shared/requestJson.ts';

Deno.serve(async (req: Request) => {
  const base44 = createClientFromRequest(req);
  try {
    const user = await base44.auth.me().catch(() => null);
    if (!user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const input = await readLimitedJson(req);
    const { training_plan_id, date, sport, prescribed_duration_minutes, prescribed_intensity_zone, rationale_text } = input ?? {};
    const parsed = typeof date === 'string' ? Date.parse(date + 'T00:00:00Z') : NaN;
    if (!isRecordId(training_plan_id) || !Number.isFinite(parsed) || new Date(parsed).toISOString().slice(0, 10) !== date ||
        !PLAN_SPORTS.includes(sport) || !Number.isFinite(prescribed_duration_minutes) ||
        prescribed_duration_minutes < 0 || prescribed_duration_minutes > 600 ||
        (prescribed_intensity_zone != null && (typeof prescribed_intensity_zone !== 'string' || prescribed_intensity_zone.length > 80)) ||
        (rationale_text != null && (typeof rationale_text !== 'string' || rationale_text.length > 1000))) {
      return Response.json({ error: 'Invalid planned session' }, { status: 400 });
    }

    const entities = base44.asServiceRole.entities;
    const plan = await entities.TrainingPlan.get(training_plan_id).catch(() => null);
    const athlete = plan && await getAuthorizedAthlete(base44, user, plan.athlete_id);
    if (!athlete || plan.status !== 'active') return Response.json({ error: 'Active plan not found' }, { status: 404 });
    const session = await entities.TrainingPlanSession.create({
      training_plan_id, athlete_id: athlete.id, created_by_id: athlete.created_by_id,
      date, sport, prescribed_duration_minutes, prescribed_intensity_zone, rationale_text,
      status: 'pending',
    });
    return Response.json({ success: true, session });
  } catch {
    return Response.json({ error: 'Could not add planned session' }, { status: 500 });
  }
});
