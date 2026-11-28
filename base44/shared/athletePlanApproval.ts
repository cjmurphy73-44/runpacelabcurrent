import { getOwnedAthlete, isRecordId } from './ownership.ts';
import { readLimitedJson } from './requestJson.ts';
import { assertPaidPlan } from './planGate.ts';

// A conservative, athlete-initiated single-session edit, NOT autonomous replan.
// Base44 entity updates are not compare-and-swap atomic. Pending rollout requires
// real-user acceptance and a durable write lock before concurrent use is enabled.
const PRIVATE = { 'Cache-Control': 'private, no-store' };
const response = (data: unknown, status = 200) => Response.json(data, { status, headers: PRIVATE });
const dateMs = (v: unknown): number | null => {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const n = Date.parse(v + 'T00:00:00Z');
  return Number.isFinite(n) && new Date(n).toISOString().slice(0, 10) === v ? n : null;
};
type Planned = {
  id: string; athlete_id: string; training_plan_id: string; date: string;
  sport: string; status: string; prescribed_duration_minutes: number;
  prescribed_intensity_zone?: string | null; updated_date?: string | null;
};
function snapshot(s: Planned) {
  return [s.id, s.training_plan_id, s.athlete_id, s.date,
    s.status, s.sport, s.prescribed_duration_minutes,
    s.prescribed_intensity_zone ?? '', s.updated_date ?? ''].join('|');
}
export function prepareAthletePlanProposal(
  session: Planned, percent: unknown, today: string,
) {
  const d = dateMs(session?.date), now = dateMs(today);
  if (now === null || d === null || d < now || d > now + 14 * 86_400_000 ||
      session.status !== 'pending' || !isRecordId(session.id) ||
      !isRecordId(session.training_plan_id) || !isRecordId(session.athlete_id) ||
      !Number.isFinite(session.prescribed_duration_minutes) ||
      session.prescribed_duration_minutes < 15 || session.prescribed_duration_minutes > 600 ||
      (percent !== 10 && percent !== 20)) {
    return { state: 'unavailable' as const, reason: 'session_not_eligible' };
  }
  const newDuration = Math.max(10, Math.round(session.prescribed_duration_minutes * (1 - percent / 100)));
  if (newDuration >= session.prescribed_duration_minutes) {
    return { state: 'unavailable' as const, reason: 'no_effective_change' };
  }
  return {
    state: 'preview_only' as const, session_id: session.id,
    training_plan_id: session.training_plan_id, date: session.date, sport: session.sport,
    previous_duration_minutes: session.prescribed_duration_minutes,
    proposed_duration_minutes: newDuration,
    previous_intensity_zone: session.prescribed_intensity_zone ?? '',
    change_percent: percent,
    expected_snapshot: snapshot(session),
    evidence_note: 'A conservative athlete-requested duration reduction, not an automatic medical or fitness prescription.',
    requires_explicit_approval: true,
  };
}
export async function handleAthletePlanApproval(
  base44: any, req: Request, now: () => string = () => new Date().toISOString().slice(0, 10),
  writesEnabled = false,
) {
  if (req.method !== 'POST') return response({ error: 'Method not allowed' }, 405);
  const user = await base44.auth.me().catch(() => null);
  if (!user?.id) return response({ error: 'Unauthorized' }, 401);
  const input = await readLimitedJson(req);
  if (!input || !['preview', 'approve'].includes(input.action) ||
      !isRecordId(input.session_id) || ![10, 20].includes(input.reduction_percent)) {
    return response({ error: 'Invalid request' }, 400);
  }
  try {
    const athlete = await getOwnedAthlete(base44, user.id);
    if (!athlete?.id || athlete.created_by_id !== user.id) {
      return response({ error: 'Not found' }, 404);
    }
    const entities = base44.asServiceRole.entities;
    const session = await entities.TrainingPlanSession.get(input.session_id).catch(() => null);
    if (!session || session.athlete_id !== athlete.id) return response({ error: 'Not found' }, 404);
    const plan = await entities.TrainingPlan.get(session.training_plan_id).catch(() => null);
    if (!plan || plan.athlete_id !== athlete.id || plan.status !== 'active') {
      return response({ error: 'Active plan unavailable' }, 409);
    }
    const preview = prepareAthletePlanProposal(session, input.reduction_percent, now());
    if (preview.state !== 'preview_only') return response(preview, 409);
    if (input.action === 'preview') return response(preview);
    // Always return the preview when writes are unavailable, but never claim
    // a successful plan update. Deployment defaults to read-only.
    if (!writesEnabled) return response({
      state: 'approval_unavailable', reason: 'durable_write_gate_not_verified',
      preview,
    }, 409);
    if (input.confirm !== 'APPLY' || typeof input.expected_snapshot !== 'string' ||
        input.expected_snapshot !== preview.expected_snapshot) {
      return response({ error: 'Preview has changed; review again' }, 409);
    }
    const gate = await assertPaidPlan(base44, user);
    if (!gate.ok) return response({ error: 'Paid plan required' }, 402);
    const latest = await entities.TrainingPlanSession.get(input.session_id);
    const livePlan = await entities.TrainingPlan.get(session.training_plan_id);
    if (snapshot(latest) !== preview.expected_snapshot || livePlan?.status !== 'active' ||
        livePlan.athlete_id !== athlete.id) {
      return response({ error: 'Plan changed; review the new preview' }, 409);
    }
    // One row, limited reduction, never alter another session or intensity.
    await entities.TrainingPlanSession.update(session.id, {
      prescribed_duration_minutes: preview.proposed_duration_minutes,
      status: 'modified',
    });
    const saved = await entities.TrainingPlanSession.get(session.id);
    if (saved?.athlete_id !== athlete.id || saved?.status !== 'modified' ||
        saved?.prescribed_duration_minutes !== preview.proposed_duration_minutes) {
      return response({ state: 'unverified_write', reason: 'readback_failed' }, 503);
    }
    return response({ state: 'applied', session_id: session.id,
      previous_duration_minutes: preview.previous_duration_minutes,
      prescribed_duration_minutes: preview.proposed_duration_minutes,
      athlete_approved: true });
  } catch {
    return response({ state: 'unavailable', reason: 'plan_storage_failure' }, 503);
  }
}
