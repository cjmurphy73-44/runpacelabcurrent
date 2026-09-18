import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import {
  TABLES, sleep, getAirtableToken,
  airtableList, upsertByKey, createBatch, updateBatch,
  toDateOnly, toISO, safeSelect, num,
} from '../../shared/airtableClient.ts';
import { reportError } from '../../shared/errorReport.ts';

// airtableSync — pushes TrainPaceLab data into the "Telemetry & AI Coaching
// Business Tracker" Airtable base via the authorized SHARED airtable connector.
//   action: "sync_business_snapshot" — legacy MRR/plan/segment snapshot (admin).
//   action: "sync_app_mirror" — comprehensive hourly mirror: athletes, workouts,
//     plans, subscribers, coach roster, the backend-function catalog (Features),
//     and feature usage/performance (System Health Metrics, linked to Features),
//     plus the finance/segment snapshot so one run keeps the whole base current.
// Airtable has no table/field create scope, so we upsert into existing tables.

const PLAN_PRICE: Record<string, number> = { free: 0, pro: 9, unlimited: 15, coach_pro: 29, team: 29 };

// Entity sport → Airtable Workouts.sport singleSelect (strength maps to "other").
const SPORT_MAP: Record<string, string> = {
  running: 'running', cycling: 'cycling', swimming: 'swimming',
  triathlon: 'triathlon', other: 'other', strength: 'other',
};
// Entity source_format → Airtable Workouts.source_format (webhook → manual).
const SOURCE_MAP: Record<string, string> = { fit: 'fit', tcx: 'tcx', csv: 'csv', webhook: 'manual' };
// TrainingPlan.tier (conservative/intermediate/aggressive) → Airtable Plans.tier (moderate).
const PLAN_TIER_MAP: Record<string, string> = {
  conservative: 'conservative', intermediate: 'moderate', aggressive: 'aggressive',
};

// One row per backend function → the Features catalog (Status = Released).
const FUNCTION_PURPOSES: Record<string, string> = {
  aiDeepDive: 'AI deep-dive correlating recovery cost with training stress into an actionable report.',
  airtableSync: 'Syncs the app mirror (data, function catalog, metrics) into the Airtable telemetry base.',
  autoReplanOnDeviation: 'Auto-replans training sessions when actuals deviate from prescription.',
  bulkIngestWorkouts: 'Bulk-ingests workout FIT/CSV files with deduplication.',
  calculateDailyTRIMP: 'Calculates and stores daily TRIMP, then triggers CTL/ATL/TSB recalculation.',
  coachBriefing: 'Generates a coach-voiced briefing over the last ~2 weeks of training.',
  commitTrainingPlan: 'Persists a generated training plan and its sessions.',
  corosSync: 'Syncs historical activities from a COROS OAuth connection.',
  fetchAthleteProfile: 'Returns the calling user athlete profile.',
  garminSync: 'Syncs historical activities from a Garmin OAuth connection.',
  garminWebhook: 'Receives Garmin Health webhook pushes (recovery + activities).',
  generateRaceStrategy: 'Generates a race-day pacing and strategy plan.',
  generateTrainingPlan: 'Generates an adaptive, race-anchored training plan.',
  ingestWorkoutFile: 'Ingests a single workout file (FIT/TCX/CSV), reconciling multi-file assets.',
  parseRecoveryScreenshot: 'OCR-parses a recovery screenshot into structured biometrics.',
  parseWorkoutScreenshot: 'OCR-parses a workout screenshot into a session summary.',
  postWorkoutAIEvaluation: 'Generates AI post-workout insight and links it to the session.',
  recalculateCTLATLTSB: 'Recomputes CTL/ATL/TSB across all days for an athlete.',
  refreshTelemetryState: 'Refreshes the frontend telemetry state cache.',
  requestMicroadjustment: 'Requests a micro-adjustment from the AI coach.',
  resetAthleteData: 'Permanently deletes an athlete workouts/plans/metrics.',
  stravaSync: 'Syncs historical activities from a Strava OAuth connection.',
  stripeCheckout: 'Creates a Stripe hosted checkout session for subscriptions.',
  stripeWebhook: 'Receives Stripe subscription webhook events.',
  testMathPipeline: 'Runs the physiology math pipeline against golden test cases.',
  updateAthleteProfile: 'Updates the calling user athlete profile fields.',
  wearableOAuthSync: 'Generic OAuth sync for free wearable providers (Oura/Whoop/Withings/etc).',
  webhookWearableSync: 'Receives wearable workout telemetry via webhook.',
  workoutWebhook: 'Personalized per-athlete webhook for automated workout ingestion.',
};

// --- row builders -----------------------------------------------------------

function buildAthleteRows(athletes: any[]): any[] {
  return athletes.map((a) => ({
    'athlete_id': a.id,
    'name': `${a.first_name || ''} ${a.last_name || ''}`.trim(),
    'role': safeSelect(a.profile_role, ['athlete', 'coach']),
    'tier': safeSelect(a.training_tier_preference, ['conservative', 'moderate', 'aggressive']),
    'current_ctl': num(a.current_ctl),
    'current_atl': num(a.current_atl),
    'current_tsb': num(a.current_tsb),
    'last_data_sync': toDateOnly(a.last_data_sync),
  }));
}

function buildWorkoutRows(workouts: any[], athleteIdMap: Record<string, string>): any[] {
  return workouts.map((w) => {
    const aId = athleteIdMap[w.athlete_id];
    const row: any = {
      'session_id': w.id,
      'date': toDateOnly(w.date),
      'sport': SPORT_MAP[w.sport] || undefined,
      'duration_minutes': num(w.duration_minutes),
      'distance_km': num(w.distance_km),
      'session_trimp': num(w.session_trimp),
      'source_format': SOURCE_MAP[w.source_format] || undefined,
    };
    if (aId) row['athlete_id'] = [aId];
    return row;
  });
}

function buildPlanRows(plans: any[], athleteIdMap: Record<string, string>): any[] {
  return plans.map((p) => {
    const aId = athleteIdMap[p.athlete_id];
    const row: any = {
      'plan_id': p.id,
      'status': safeSelect(p.status, ['draft', 'active', 'completed', 'archived']),
      'tier': PLAN_TIER_MAP[p.tier] || undefined,
      'start_date': toDateOnly(p.start_date),
      'end_date': toDateOnly(p.end_date),
      'plan_title': p.plan_title || undefined,
    };
    if (aId) row['athlete_id'] = [aId];
    return row;
  });
}

function buildSubscriberRows(subscriptions: any[]): any[] {
  return subscriptions.map((s) => ({
    'user_id': s.user_id,
    'plan': safeSelect(s.plan, ['free', 'pro', 'unlimited', 'coach_pro', 'team']),
    'status': safeSelect(s.status, ['active', 'trialing', 'past_due', 'canceled']),
    'current_period_end': toDateOnly(s.current_period_end),
    'stripe_customer_id': s.stripe_customer_id || undefined,
    'created_date': toDateOnly(s.created_date),
    // 'mrr' is a formula field — read-only, never written.
  }));
}

function buildFeatureRows(): any[] {
  return Object.keys(FUNCTION_PURPOSES).map((fn) => ({
    'Feature Name': fn,
    'Module Path': `base44/functions/${fn}`,
    'Status': 'Released',
    'Business Value': FUNCTION_PURPOSES[fn],
  }));
}

// CoachRoster uses a composite key (coach_user_id + linked athlete) since one coach
// has many athletes. Resolved against the athlete Airtable-id map from step 1.
async function syncCoachRoster(
  token: string,
  assignments: any[],
  athleteIdMap: Record<string, string>
): Promise<{ created: number; updated: number }> {
  const existing = await airtableList(token, TABLES.coachRoster);
  const idByComposite: Record<string, string> = {};
  for (const rec of existing) {
    const coach = rec.fields?.['coach_user_id'];
    const linked = rec.fields?.['athlete_id'];
    const aId = Array.isArray(linked) ? linked[0] : undefined;
    if (coach) idByComposite[`${coach}|${aId || ''}`] = rec.id;
  }
  const toCreate: any[] = [];
  const toUpdate: any[] = [];
  for (const c of assignments) {
    const aId = athleteIdMap[c.athlete_profile_id];
    const key = `${c.coach_user_id}|${aId || ''}`;
    const fields: any = {
      'coach_user_id': c.coach_user_id,
      'status': safeSelect(c.status, ['active', 'archived']),
      'notes': c.notes || undefined,
    };
    if (aId) fields['athlete_id'] = [aId];
    if (idByComposite[key]) toUpdate.push({ id: idByComposite[key], fields });
    else toCreate.push({ fields });
  }
  for (let i = 0; i < toCreate.length; i += 10) {
    await createBatch(token, TABLES.coachRoster, toCreate.slice(i, i + 10));
    await sleep(250);
  }
  for (let i = 0; i < toUpdate.length; i += 10) {
    await updateBatch(token, TABLES.coachRoster, toUpdate.slice(i, i + 10));
    await sleep(250);
  }
  return { created: toCreate.length, updated: toUpdate.length };
}

// --- shared business-snapshot calc (used by both actions) -------------------

function computeBusiness(subscriptions: any[], users: any[]) {
  let mrr = 0;
  const planCounts: Record<string, number> = { free: 0, pro: 0, unlimited: 0, coach_pro: 0, team: 0 };
  const planRev: Record<string, number> = { pro: 0, unlimited: 0, coach_pro: 0, team: 0 };
  for (const s of subscriptions) {
    if (s.status !== 'active' && s.status !== 'trialing') continue;
    const p = (s.plan || 'free') as string;
    const price = PLAN_PRICE[p] ?? 0;
    mrr += price;
    if (planCounts[p] !== undefined) planCounts[p]++;
    if (planRev[p] !== undefined) planRev[p] += price;
  }
  const subscriberUserIds = new Set(subscriptions.map((s) => s.user_id).filter(Boolean));
  planCounts.free = users.filter((u: any) => !subscriberUserIds.has(u.id)).length;
  return {
    mrr, planCounts, planRev,
    arpuPro: planCounts.pro ? planRev.pro / planCounts.pro : PLAN_PRICE.pro,
    arpuUnlimited: planCounts.unlimited ? planRev.unlimited / planCounts.unlimited : PLAN_PRICE.unlimited,
    arpuCoachPro: planCounts.coach_pro ? planRev.coach_pro / planCounts.coach_pro : PLAN_PRICE.coach_pro,
    arpuTeam: planCounts.team ? planRev.team / planCounts.team : PLAN_PRICE.team,
  };
}

function buildSystemRows(biz: any, counts: { users: number; athletes: number; workouts: number }) {
  const now = toISO(new Date().toISOString());
  return [
    { 'Metric Name': 'Active Subscribers', 'Current Status': String(biz.planCounts.pro + biz.planCounts.unlimited + biz.planCounts.coach_pro + biz.planCounts.team), 'Target Threshold': '>= 50' },
    { 'Metric Name': 'Pro Subscribers', 'Current Status': String(biz.planCounts.pro), 'Target Threshold': '>= 30' },
    { 'Metric Name': 'Unlimited Subscribers', 'Current Status': String(biz.planCounts.unlimited), 'Target Threshold': '>= 20' },
    { 'Metric Name': 'Coach Pro Subscribers', 'Current Status': String(biz.planCounts.coach_pro), 'Target Threshold': '>= 10' },
    { 'Metric Name': 'Registered Users', 'Current Status': String(counts.users), 'Target Threshold': '>= 100' },
    { 'Metric Name': 'Athlete Profiles', 'Current Status': String(counts.athletes), 'Target Threshold': '>= 100' },
    { 'Metric Name': 'Workout Sessions', 'Current Status': String(counts.workouts), 'Target Threshold': '>= 1000' },
    { 'Metric Name': 'MRR (USD)', 'Current Status': `$${biz.mrr.toFixed(2)}`, 'Target Threshold': '>= $1000' },
    { 'Metric Name': 'Airtable Sync', 'Current Status': 'OK', 'Last Tested Date': now },
  ];
}

function buildFinanceRows(biz: any) {
  return [{ 'Expense or Revenue Category': 'MRR (Monthly Recurring Revenue)', 'Cost Type': 'Revenue', 'Estimated Monthly Cost': biz.mrr }];
}

function buildSegmentRows(biz: any) {
  return [
    { 'Segment Name': 'Free / Community', 'Pricing Tier': 'Free', 'Projected ARPU': 0, 'Usage Tier': `${biz.planCounts.free} users` },
    { 'Segment Name': 'Pro Athlete', 'Pricing Tier': 'Pro', 'Projected ARPU': biz.arpuPro, 'Usage Tier': `${biz.planCounts.pro} subscribers` },
    { 'Segment Name': 'Unlimited Athlete', 'Pricing Tier': 'Unlimited', 'Projected ARPU': biz.arpuUnlimited, 'Usage Tier': `${biz.planCounts.unlimited} subscribers` },
    { 'Segment Name': 'Coach Pro', 'Pricing Tier': 'Coach Pro', 'Projected ARPU': biz.arpuCoachPro, 'Usage Tier': `${biz.planCounts.coach_pro} subscribers` },
  ];
}

// Feature usage/performance → System Health Metrics, each linked to the Features
// it measures. Overlaps the legacy Metric Names (upsert updates the same rows,
// adding the link). Only metrics derivable from already-loaded data are used.
function buildLinkedSystemRows(
  biz: any,
  counts: { users: number; athletes: number; workouts: number; plans: number },
  featureIdByName: Record<string, string>
): any[] {
  const now = toISO(new Date().toISOString());
  const link = (...names: string[]) => names.map((n) => featureIdByName[n]).filter(Boolean);
  return [
    { 'Metric Name': 'Workout Sessions', 'Current Status': String(counts.workouts), 'Target Threshold': '>= 1000', 'Last Tested Date': now, 'Linked Features': link('ingestWorkoutFile', 'workoutWebhook', 'bulkIngestWorkouts', 'webhookWearableSync') },
    { 'Metric Name': 'Athlete Profiles', 'Current Status': String(counts.athletes), 'Target Threshold': '>= 100', 'Last Tested Date': now, 'Linked Features': link('fetchAthleteProfile', 'updateAthleteProfile') },
    { 'Metric Name': 'Training Plans', 'Current Status': String(counts.plans), 'Target Threshold': '>= 50', 'Last Tested Date': now, 'Linked Features': link('generateTrainingPlan', 'commitTrainingPlan', 'autoReplanOnDeviation') },
    { 'Metric Name': 'Active Subscribers', 'Current Status': String(biz.planCounts.pro + biz.planCounts.unlimited + biz.planCounts.coach_pro + biz.planCounts.team), 'Target Threshold': '>= 50', 'Last Tested Date': now, 'Linked Features': link('stripeWebhook', 'stripeCheckout') },
    { 'Metric Name': 'Pro Subscribers', 'Current Status': String(biz.planCounts.pro), 'Target Threshold': '>= 30', 'Last Tested Date': now, 'Linked Features': link('stripeWebhook', 'stripeCheckout') },
    { 'Metric Name': 'Unlimited Subscribers', 'Current Status': String(biz.planCounts.unlimited), 'Target Threshold': '>= 20', 'Last Tested Date': now, 'Linked Features': link('stripeWebhook', 'stripeCheckout') },
    { 'Metric Name': 'Coach Pro Subscribers', 'Current Status': String(biz.planCounts.coach_pro), 'Target Threshold': '>= 10', 'Last Tested Date': now, 'Linked Features': link('stripeWebhook', 'stripeCheckout') },
    { 'Metric Name': 'Registered Users', 'Current Status': String(counts.users), 'Target Threshold': '>= 100', 'Last Tested Date': now },
    { 'Metric Name': 'MRR (USD)', 'Current Status': `$${biz.mrr.toFixed(2)}`, 'Target Threshold': '>= $1000', 'Last Tested Date': now, 'Linked Features': link('stripeWebhook', 'stripeCheckout') },
    { 'Metric Name': 'Airtable Sync', 'Current Status': 'OK', 'Last Tested Date': now, 'Linked Features': link('airtableSync') },
  ];
}

// --- handlers ---------------------------------------------------------------

// Legacy snapshot (admin-triggered). Behavior unchanged from before the mirror
// extension — same response shape, same three tables, no feature links.
async function handleSync(base44: any) {
  const user = await base44.auth.me();
  if (!user || user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

  let token: string;
  try {
    token = await getAirtableToken(base44);
  } catch {
    return Response.json({ error: 'Airtable connector not connected' }, { status: 503 });
  }

  const [subscriptions, athletes, users, workouts] = await Promise.all([
    base44.asServiceRole.entities.Subscription.list('-created_date', 500),
    base44.asServiceRole.entities.AthleteProfile.list('-created_date', 500),
    base44.asServiceRole.entities.User.list('-created_date', 500),
    base44.asServiceRole.entities.WorkoutSession.list('-created_date', 500),
  ]);

  const biz = computeBusiness(subscriptions, users);
  const counts = { users: users.length, athletes: athletes.length, workouts: workouts.length };

  const systemRes = await upsertByKey(token, TABLES.systemHealth, 'Metric Name', buildSystemRows(biz, counts));
  const financeRes = await upsertByKey(token, TABLES.finances, 'Expense or Revenue Category', buildFinanceRows(biz));
  const segmentRes = await upsertByKey(token, TABLES.userSegments, 'Segment Name', buildSegmentRows(biz));

  return Response.json({
    success: true,
    snapshot: { mrr_usd: biz.mrr, plan_counts: biz.planCounts, users: counts.users, athletes: counts.athletes, workouts: counts.workouts },
    airtable: { system_health: systemRes, finances: financeRes, user_segments: segmentRes },
  });
}

// Comprehensive hourly mirror. Per-table resilience: each table is synced in its
// own try/catch so a failure on one table does not abort the others or the run.
// Permissive auth: authenticated callers must be admin, but scheduled-workflow
// calls (no user session) are allowed so the cron can drive it.
async function handleAppMirror(base44: any) {
  const user = await base44.auth.me().catch(() => null);
  if (user && user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

  let token: string;
  try {
    token = await getAirtableToken(base44);
  } catch {
    return Response.json({ error: 'Airtable connector not connected' }, { status: 503 });
  }

  const [athletes, workouts, plans, subscriptions, assignments, users] = await Promise.all([
    base44.asServiceRole.entities.AthleteProfile.list('-created_date', 500),
    base44.asServiceRole.entities.WorkoutSession.list('-created_date', 500),
    base44.asServiceRole.entities.TrainingPlan.list('-created_date', 500),
    base44.asServiceRole.entities.Subscription.list('-created_date', 500),
    base44.asServiceRole.entities.CoachAthleteAssignment.list('-created_date', 500),
    base44.asServiceRole.entities.User.list('-created_date', 500),
  ]);

  const results: any = {};
  const athleteIdMap: Record<string, string> = {};

  // 1. Athletes — returns the id map used to link Workouts/Plans/CoachRoster.
  try {
    const r = await upsertByKey(token, TABLES.athletes, 'athlete_id', buildAthleteRows(athletes));
    Object.assign(athleteIdMap, r.idByKey);
    results.athletes = { created: r.created, updated: r.updated };
  } catch (e: any) { results.athletes = { error: e.message }; }

  try { results.workouts = await upsertByKey(token, TABLES.workouts, 'session_id', buildWorkoutRows(workouts, athleteIdMap)); } catch (e: any) { results.workouts = { error: e.message }; }
  try { results.plans = await upsertByKey(token, TABLES.plans, 'plan_id', buildPlanRows(plans, athleteIdMap)); } catch (e: any) { results.plans = { error: e.message }; }
  try { results.subscribers = await upsertByKey(token, TABLES.subscribers, 'user_id', buildSubscriberRows(subscriptions)); } catch (e: any) { results.subscribers = { error: e.message }; }
  try { results.coach_roster = await syncCoachRoster(token, assignments, athleteIdMap); } catch (e: any) { results.coach_roster = { error: e.message }; }

  // 6. Function catalog → Features (id map feeds the linked System Health rows).
  const featureIdByName: Record<string, string> = {};
  try {
    const r = await upsertByKey(token, TABLES.features, 'Feature Name', buildFeatureRows());
    Object.assign(featureIdByName, r.idByKey);
    results.features = { created: r.created, updated: r.updated };
  } catch (e: any) { results.features = { error: e.message }; }

  // 7. Feature usage/performance → System Health Metrics (linked to Features).
  // 8. Finances + User Segments (absorbed so the hourly run is complete).
  try {
    const biz = computeBusiness(subscriptions, users);
    const counts = { users: users.length, athletes: athletes.length, workouts: workouts.length, plans: plans.length };
    results.system_health = await upsertByKey(token, TABLES.systemHealth, 'Metric Name', buildLinkedSystemRows(biz, counts, featureIdByName));
    results.finances = await upsertByKey(token, TABLES.finances, 'Expense or Revenue Category', buildFinanceRows(biz));
    results.user_segments = await upsertByKey(token, TABLES.userSegments, 'Segment Name', buildSegmentRows(biz));
  } catch (e: any) { results.system_health = { error: e.message }; results.finances = { error: e.message }; results.user_segments = { error: e.message }; }

  return Response.json({ success: true, results });
}

Deno.serve(async (req) => {
  let base44: any;
  try {
    base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const action = body.action;
    if (action === 'sync_business_snapshot') return await handleSync(base44);
    if (action === 'sync_app_mirror') return await handleAppMirror(base44);
    return Response.json({ error: `Unknown action: ${action || '(none)'}` }, { status: 400 });
  } catch (error) {
    try {
      if (base44) await reportError(base44, { source: 'airtableSync', message: error.message, stack: error.stack, severity: 'Medium' });
    } catch (e) { console.warn('reportError failed:', e); }
    console.error('airtableSync error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});