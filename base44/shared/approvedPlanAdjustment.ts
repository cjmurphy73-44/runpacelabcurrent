import { getOwnedAthlete, isRecordId } from './ownership.ts';
import { readScoped, buildCombinedAthleteUnderstanding } from './athleteUnderstanding.ts';
import { assertPaidPlan } from './planGate.ts';

const NO_STORE = { 'Cache-Control': 'private, no-store' };
const DAY_MS = 86400000;
const WORKOUT_FIELDS = ['id', 'date', 'sport', 'duration_seconds', 'duration_minutes',
  'distance_km', 'avg_hr', 'avg_power', 'session_trimp', 'session_tss',
  'load_source', 'load_coverage_pct'];
const RECOVERY_FIELDS = ['date', 'hrv', 'resting_hr', 'sleep_duration_hours'];
const MARKER = 'Athlete-approved training adjustment v1';
const response = (value: unknown, status = 200) =>
  Response.json(value, { status, headers: NO_STORE });

function calendarDate(value: unknown): number | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const stamp = Date.parse(value + 'T00:00:00.000Z');
  return Number.isFinite(stamp) && new Date(stamp).toISOString().slice(0, 10) === value
    ? stamp : null;
}
const duration = (value: unknown) =>
  typeof value === 'number' && Number.isInteger(value) && value >= 15 && value <= 600;
const zone = (value: unknown) => typeof value === 'string' && value.length <= 40;

/** Pure, descriptive advice. No AI-produced values and no write side effects. */
export function deriveApprovalSuggestion(context: any, session: any, today: string) {
  const now = calendarDate(today);
  const sessionDay = calendarDate(session?.date);
  if (now === null || sessionDay === null || sessionDay < now ||
      sessionDay > now + 14 * DAY_MS || !isRecordId(session?.id) ||
      session?.status !== 'pending' || session?.completed_workout_id ||
      !duration(session?.prescribed_duration_minutes) ||
      !zone(session?.prescribed_intensity_zone ?? '')) {
    return { state: 'unavailable', reason: 'no_eligible_pending_session' };
  }
  const history = context?.history;
  const prior = history?.previous_week;
  const current = history?.recent_week;
  if (context?.state !== 'observational_only' || history?.state !== 'available' ||
      history?.confidence !== 'observational_only' ||
      history?.session_coverage?.history_truncated ||
      !current || !prior || current.workouts < 2 || prior.workouts < 2 ||
      typeof prior.minutes !== 'number' || prior.minutes < 60 ||
      typeof current.minutes !== 'number' || !Number.isFinite(current.minutes)) {
    return { state: 'insufficient_evidence',
      reason: 'Comparable recent and prior weeks require at least two workouts each.' };
  }
  const change = (current.minutes - prior.minutes) / prior.minutes;
  if (!(change >= 0.25)) {
    return { state: 'no_adjustment_suggested',
      reason: 'Recorded training volume does not indicate the predefined increase.' };
  }
  const original = session.prescribed_duration_minutes;
  const proposed = Math.max(15, Math.round(original * 0.9));
  if (proposed >= original) return { state: 'no_adjustment_suggested', reason: 'Duration unchanged.' };
  return {
    state: 'proposal',
    session_id: session.id,
    plan_id: session.training_plan_id,
    session_date: session.date,
    sport: session.sport,
    original_duration_minutes: original,
    proposed_duration_minutes: proposed,
    intensity_zone: session.prescribed_intensity_zone ?? '',
    evidence: { recent_workouts: current.workouts, prior_workouts: prior.workouts,
      recent_minutes: current.minutes, prior_minutes: prior.minutes,
      relative_change_percent: Math.round(change * 100) },
    explanation: 'Recorded training minutes were at least 25% higher than the prior week. ' +
      'Consider reducing one upcoming session by 10%, subject to your own judgement.',
    limitations: [
      'Missing workouts may change the comparison; absence of data does not confirm rest.',
      'This is a conservative schedule option, not injury clearance or a diagnosis.',
      'Recovery and cycle journal data are not used to prescribe this adjustment.',
    ],
    requires_athlete_approval: true,
    applied: false,
  };
}

export async function handleApprovedPlanAdjustment(base44: any, req: Request) {
  if (req.method !== 'POST') return response({ error: 'Method not allowed' }, 405);
  const user = await base44.auth.me().catch(() => null);
  if (!user?.id) return response({ error: 'Unauthorized' }, 401);
  let data: any;
  try { data = await req.json(); } catch { return response({ error: 'Invalid JSON' }, 400); }
  if (!data || !['preview', 'apply'].includes(data.action))
    return response({ error: 'Invalid action' }, 400);
  if (data.action === 'apply' && (data.approved !== true || !isRecordId(data.session_id) ||
      !duration(data.original_duration_minutes) || !duration(data.proposed_duration_minutes) ||
      !zone(data.intensity_zone))) return response({ error: 'Explicit approval required' }, 400);

  try {
    const athlete = await getOwnedAthlete(base44, user.id);
    // Assigned coaches and admins cannot impersonate the consenting athlete.
    if (!athlete?.id || athlete.created_by_id !== user.id)
      return response({ error: 'Athlete not found' }, 404);
    const paid = await assertPaidPlan(base44, user);
    if (!paid.ok) return response({ error: 'Pro subscription required' }, 402);
    const entities = base44.asServiceRole.entities;
    const plans = await entities.TrainingPlan.filter({ athlete_id: athlete.id, status: 'active' },
      '-created_date', 2);
    if (!Array.isArray(plans) || plans.length !== 1 || plans[0].athlete_id !== athlete.id)
      return response({ state: 'unavailable', reason: 'active_plan_ambiguous' }, 409);
    const sessions = await entities.TrainingPlanSession.filter({
      athlete_id: athlete.id, training_plan_id: plans[0].id,
    }, 'date', 300);
    if (!Array.isArray(sessions) || sessions.length >= 300 ||
        sessions.some((s: any) => s.athlete_id !== athlete.id ||
          s.training_plan_id !== plans[0].id))
      return response({ state: 'unavailable', reason: 'plan_sessions_unavailable' }, 409);
    const today = new Date().toISOString().slice(0, 10);
    const upcoming = sessions.filter((s: any) => s.status === 'pending' &&
      !s.completed_workout_id && calendarDate(s.date) !== null && s.date >= today)
      .sort((a: any, b: any) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
    const target = upcoming[0];
    if (data.action === 'apply') {
      const existing = sessions.find((s: any) => s.id === data.session_id);
      if (existing?.athlete_id === athlete.id && existing.training_plan_id === plans[0].id &&
          existing.prescribed_duration_minutes === data.proposed_duration_minutes &&
          typeof existing.rationale_text === 'string' &&
          existing.rationale_text.startsWith(MARKER + ':') &&
          !existing.completed_workout_id) {
        return response({ state: 'already_applied', session_id: existing.id });
      }
    }
    if (!target) return response({ state: 'unavailable', reason: 'no_eligible_pending_session' }, 409);
    const [workouts, recovery] = await Promise.all([
      readScoped(entities.WorkoutSession, athlete.id, WORKOUT_FIELDS, 2000),
      readScoped(entities.DailyMetrics, athlete.id, RECOVERY_FIELDS, 1000),
    ]);
    const context = buildCombinedAthleteUnderstanding(workouts, recovery, today);
    const proposal = deriveApprovalSuggestion(context, target, today);
    if (data.action === 'preview') return response(proposal);

    if (proposal.state !== 'proposal' || proposal.session_id !== data.session_id ||
        proposal.original_duration_minutes !== data.original_duration_minutes ||
        proposal.proposed_duration_minutes !== data.proposed_duration_minutes ||
        proposal.intensity_zone !== data.intensity_zone ||
        proposal.plan_id !== data.plan_id) {
      return response({ state: 'stale_proposal', reason: 'Evidence or plan changed; preview again.' }, 409);
    }
    // Check the authoritative record again immediately before updating.
    // Base44 offers no transactional compare-and-set; concurrency acceptance
    // remains required and this is deliberately restricted to one record.
    const current = await entities.TrainingPlanSession.get(target.id);
    if (!current || current.athlete_id !== athlete.id ||
        current.training_plan_id !== plans[0].id || current.status !== 'pending' ||
        current.completed_workout_id ||
        current.prescribed_duration_minutes !== proposal.original_duration_minutes ||
        (current.prescribed_intensity_zone ?? '') !== proposal.intensity_zone) {
      return response({ state: 'stale_proposal', reason: 'Session changed; preview again.' }, 409);
    }
    await entities.TrainingPlanSession.update(target.id, {
      prescribed_duration_minutes: proposal.proposed_duration_minutes,
      rationale_text: MARKER + ': ' + proposal.explanation,
    });
    const verified = await entities.TrainingPlanSession.get(target.id);
    if (!verified || verified.athlete_id !== athlete.id ||
        verified.prescribed_duration_minutes !== proposal.proposed_duration_minutes ||
        !String(verified.rationale_text ?? '').startsWith(MARKER + ':')) {
      return response({ state: 'write_unverified' }, 503);
    }
    return response({ state: 'applied', session_id: target.id,
      original_duration_minutes: proposal.original_duration_minutes,
      prescribed_duration_minutes: proposal.proposed_duration_minutes });
  } catch {
    return response({ state: 'unavailable', reason: 'read_or_write_failed' }, 503);
  }
}
