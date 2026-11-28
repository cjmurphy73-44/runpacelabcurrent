/**
 * Athlete-owned, two-step plan review. Deterministic evidence only; never use
 * journal data, LLM-supplied physiology, or unauthorised coach access.
 *
 * Preview is read-only. Apply requires a separate affirmative action, exact
 * reviewed session preconditions and a fresh owner/plan check. Base44 update
 * is not atomic across multiple records; this deliberately updates one row.
 */
import { getOwnedAthlete, isRecordId } from './ownership.ts';
import { assertPaidPlan } from './planGate.ts';
import { evidenceAwareAthleteContext } from './athleteEvidence.ts';

const headers = { 'Cache-Control': 'private, no-store' };
const respond = (body: unknown, status = 200) => Response.json(body, { status, headers });
const LIMIT = 120;
const DAY_MS = 86_400_000;
const dateString = () => new Date().toISOString().slice(0, 10);

export function buildPlanReview(
  session: any, workouts: any[], recovery: any[], referenceDate: string,
) {
  const evidence = evidenceAwareAthleteContext(workouts, recovery, referenceDate);
  if (evidence.state !== 'available') {
    return { state: 'unavailable' as const, reason: 'history_unavailable' };
  }
  const recordedDays = evidence.session_coverage.days_with_saved_workouts;
  const duration = session.prescribed_duration_minutes;
  const date = session.date;
  const context = {
    recent_workouts: evidence.recent_week.workouts,
    previous_week: evidence.previous_week?.workouts ?? null,
    observed_days_28d: recordedDays,
    unobserved_days_28d: evidence.session_coverage.days_without_saved_workouts,
    hrv_state: evidence.recovery.hrv.state,
    resting_hr_state: evidence.recovery.resting_hr.state,
    sleep_state: evidence.recovery.sleep_duration_hours.state,
    confidence: evidence.confidence,
    load_units_separate: true,
    journal_used: false,
  };
  // A missing/short training history must not be converted into a positive
  // model recommendation or a readiness diagnosis.
  if (recordedDays < 3 || !Number.isFinite(duration) || duration < 20 || duration > 360) {
    return {
      state: 'insufficient_evidence' as const, context, proposal: null,
      explanation: 'Not enough comparable saved training to suggest a plan change. No session was modified.',
    };
  }
  const reduction = Math.max(1, Math.min(15, Math.round(duration * 0.1)));
  const proposedMinutes = duration - reduction;
  // Non-secret fingerprint to enforce that confirmation follows exactly the
  // same session snapshot. Ownership and all values are validated server-side.
  const snapshot = [session.id, date, session.sport, duration, session.prescribed_intensity_zone ?? '', 'v1'].join(':');
  return {
    state: 'review_available' as const, context,
    proposal: {
      session_id: session.id, date, sport: session.sport,
      old_duration_minutes: duration, proposed_duration_minutes: proposedMinutes,
      intensity_zone: session.prescribed_intensity_zone ?? '',
      snapshot,
      rationale: `Optional conservative reduction of ${reduction} minutes for the athlete to consider; ${recordedDays} of 28 calendar days have saved workouts. Blank days are unknown, not confirmed rest. This is not a diagnosis or a required training change.`,
    },
    explanation: 'An optional, athlete-controlled reduction is available. Training and recovery measurements are descriptive, not medical clearance.',
  };
}

export async function handleAthletePlanReview(base44: any, req: Request) {
  if (req.method !== 'POST') return respond({ error: 'Method not allowed' }, 405);
  const user = await base44.auth.me().catch(() => null);
  if (!user?.id) return respond({ error: 'Unauthorized' }, 401);
  let input: any;
  try {
    const text = await req.text();
    if (text.length > 4096) return respond({ error: 'Request too large' }, 413);
    input = JSON.parse(text);
  } catch { return respond({ error: 'Invalid request' }, 400); }
  if (!input || !['preview', 'apply'].includes(input.action) || !isRecordId(input.session_id)) {
    return respond({ error: 'Invalid action or session id' }, 400);
  }
  try {
    const athlete = await getOwnedAthlete(base44, user.id);
    if (!athlete?.id || athlete.created_by_id !== user.id) {
      return respond({ error: 'Athlete not found' }, 404);
    }
    const paid = await assertPaidPlan(base44, user);
    if (!paid.ok) return respond({ error: 'Requires an eligible plan' }, 402);
    const e = base44.asServiceRole.entities;
    const session = await e.TrainingPlanSession.get(input.session_id);
    if (!session || session.athlete_id !== athlete.id ||
        session.status !== 'pending' || session.date < dateString()) {
      return respond({ error: 'Session is not an upcoming owned pending workout' }, 409);
    }
    const plan = await e.TrainingPlan.get(session.training_plan_id);
    if (!plan || plan.athlete_id !== athlete.id || plan.status !== 'active') {
      return respond({ error: 'No active plan for this session' }, 409);
    }
    const earliest = new Date(Date.now() - 90 * DAY_MS).toISOString().slice(0, 10);
    const [workouts, recovery] = await Promise.all([
      e.WorkoutSession.filter({ athlete_id: athlete.id, date: { $gte: earliest } }, '-date', LIMIT),
      e.DailyMetrics.filter({ athlete_id: athlete.id, date: { $gte: earliest } }, '-date', LIMIT),
    ]);
    if (!Array.isArray(workouts) || !Array.isArray(recovery) ||
        workouts.length >= LIMIT || recovery.length >= LIMIT ||
        [...workouts, ...recovery].some(row => row.athlete_id !== athlete.id)) {
      return respond({ error: 'Training evidence is incomplete' }, 503);
    }
    const review = buildPlanReview(session, workouts, recovery, dateString());
    if (input.action === 'preview') return respond({
      ...review, applied: false, read_only: true,
    });
    if (input.confirm !== 'APPLY_REVIEWED_REDUCTION' ||
        review.state !== 'review_available' || !review.proposal ||
        input.snapshot !== review.proposal.snapshot ||
        input.proposed_duration_minutes !== review.proposal.proposed_duration_minutes) {
      return respond({ error: 'Review the current proposal before confirming' }, 409);
    }
    // Re-read to reject stale reviews, finished sessions, or a changed plan.
    const current = await e.TrainingPlanSession.get(session.id);
    if (!current || current.athlete_id !== athlete.id ||
        current.status !== 'pending' ||
        current.training_plan_id !== plan.id ||
        current.date !== session.date ||
        current.sport !== session.sport ||
        current.prescribed_duration_minutes !== session.prescribed_duration_minutes ||
        (current.prescribed_intensity_zone ?? '') !== (session.prescribed_intensity_zone ?? '')) {
      return respond({ error: 'Session changed. Review it again.' }, 409);
    }
    // Only the reviewed duration changes; leave zones and medical signals alone.
    await e.TrainingPlanSession.update(current.id, {
      prescribed_duration_minutes: review.proposal.proposed_duration_minutes,
      status: 'modified',
      rationale_text: review.proposal.rationale,
    });
    const after = await e.TrainingPlanSession.get(current.id);
    if (!after || after.athlete_id !== athlete.id ||
        after.status !== 'modified' ||
        after.prescribed_duration_minutes !== review.proposal.proposed_duration_minutes) {
      return respond({ error: 'Plan update could not be verified. Refresh before retrying.' }, 503);
    }
    return respond({
      applied: true, session_id: current.id,
      duration_minutes: after.prescribed_duration_minutes,
      note: 'Athlete-confirmed, single-session adjustment. No automatic plan changes.',
    });
  } catch {
    return respond({ error: 'Plan review unavailable; no success was confirmed' }, 503);
  }
}
