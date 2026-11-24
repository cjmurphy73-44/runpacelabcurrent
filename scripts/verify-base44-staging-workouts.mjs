// Run against the existing TrainPaceLab staging app with authorized test roles.
// This script never targets production and never prints tokens or athlete data.
import assert from 'node:assert/strict';
import { createClient } from '@base44/sdk';

const appId = '6aefe9d09e2788fc8591c758';
const serverUrl = 'https://train-pace-lab-copy-8591c758.base44.app';
const athleteOnly = process.argv[2] === '--athlete-only';
assert.ok(process.argv.length === 2 || (process.argv.length === 3 && athleteOnly), 'Unknown verification option');
const account = (key) => {
  const token = process.env[key];
  assert.ok(token, `${key} must be supplied by an authorized staging test session`);
  return createClient({ appId, serverUrl, appBaseUrl: serverUrl, token });
};
const verified = [];
const fixtures = [];
const statusOf = error => error?.response?.status ?? error?.status;
async function denied(action) {
  try {
    const result = await action();
    if (result == null) return true;
    return [401, 403, 404].includes(result.status);
  } catch (error) {
    return [401, 403, 404].includes(statusOf(error));
  }
}

let athlete;
let profile;
let check = 'authorization';
let exitCode = 0;
try {
  athlete = account('TPL_STAGING_ATHLETE_TOKEN');
  const owner = await athlete.auth.me();
  assert.equal(owner.role, 'user');
  const owned = await athlete.entities.AthleteProfile.filter({ created_by_id: owner.id }, '-updated_date', 2);
  assert.equal(owned.length, 1);
  profile = owned[0];
  const date = new Date().toISOString().slice(0, 10);
  const manual = { athlete_id: profile.id, date, sport: 'walking', duration_minutes: 23, rpe: 3 };
  verified.push(check);

  check = 'walking save, history and training load';
  const before = await athlete.entities.DailyMetrics.filter({ athlete_id: profile.id, date }, 'id', 2);
  assert.ok(before.length <= 1, 'Use a staging test athlete without duplicate daily rows');
  const walk = (await athlete.functions.invoke('logManualWorkout', manual)).data;
  if (walk?.workout_session?.id) fixtures.push(walk.workout_session.id);
  assert.equal(walk?.success, true);
  assert.equal(walk.training_load_refreshed, true);
  const saved = await athlete.entities.WorkoutSession.get(walk.workout_session.id);
  assert.equal(saved.sport, 'walking');
  assert.equal(saved.duration_seconds, 1380);
  const history = await athlete.entities.WorkoutSession.filter({ athlete_id: profile.id, date }, '-created_date', 100);
  assert.ok(history.some(row => row.id === saved.id));
  const daily = await athlete.entities.DailyMetrics.filter({ athlete_id: profile.id, date }, '-created_date', 10);
  assert.equal(daily.length, 1);
  assert.ok(Number.isFinite(daily[0].calculated_ctl));
  assert.equal(daily[0].total_trimp, (before[0]?.total_trimp ?? 0) + 41);
  verified.push(check);

  check = 'legacy workout persistence';
  const legacy = await athlete.entities.WorkoutSession.create({
    athlete_id: profile.id, date, sport: 'running', duration_minutes: 17,
    duration_seconds: 1020, source_format: 'csv', session_trimp: 0, session_tss: 12,
  });
  if (legacy?.id) fixtures.push(legacy.id);
  assert.equal((await athlete.entities.WorkoutSession.get(legacy.id)).sport, 'running');
  verified.push(check);

  if (!athleteOnly) {
    check = 'athlete and coach isolation';
    const other = account('TPL_STAGING_OTHER_ATHLETE_TOKEN');
    const coach = account('TPL_STAGING_COACH_TOKEN');
    const [outsider, coachUser] = await Promise.all([other.auth.me(), coach.auth.me()]);
    assert.equal(new Set([owner.id, outsider.id, coachUser.id]).size, 3);
    assert.notEqual(outsider.role, 'admin');
    assert.notEqual(coachUser.role, 'admin');
    const assigned = await coach.entities.CoachAthleteAssignment.filter({
      athlete_profile_id: profile.id, coach_user_id: coachUser.id, status: 'active',
    }, 'id', 2);
    assert.equal(assigned.length, 1);
    assert.ok(await denied(() => other.functions.invoke('logManualWorkout', manual)));
    assert.ok(await denied(() => other.entities.WorkoutSession.get(saved.id)));
    assert.equal((await coach.entities.WorkoutSession.get(saved.id))?.id, saved.id);
    verified.push(check);

    check = 'active plan and coach reads';
    const plans = await athlete.entities.TrainingPlan.filter({ athlete_id: profile.id, status: 'active' }, '-created_date', 2);
    assert.equal(plans.length, 1);
    const sessions = await athlete.entities.TrainingPlanSession.filter({ athlete_id: profile.id, training_plan_id: plans[0].id }, 'date', 100);
    assert.ok(sessions.length > 0);
    assert.equal((await coach.entities.TrainingPlan.get(plans[0].id))?.id, plans[0].id);
    assert.ok(await denied(() => other.entities.TrainingPlan.get(plans[0].id)));
    assert.ok(await denied(() => other.functions.invoke('postWorkoutAIEvaluation', {
      workout_session_id: saved.id, athlete_id: profile.id,
    })));
    verified.push(check);

    check = 'original COROS FIT';
    const id = process.env.TPL_STAGING_COROS_WORKOUT_ID;
    const expectedCount = Number(process.env.TPL_STAGING_COROS_SAMPLE_COUNT);
    const expectedEnd = Number(process.env.TPL_STAGING_COROS_LAST_SECOND);
    const expectedSha256 = process.env.TPL_STAGING_COROS_SHA256;
    assert.ok(id && expectedCount > 3600 && expectedEnd > 3600);
    assert.match(expectedSha256 ?? "", /^[a-f0-9]{64}$/);
    const coros = await athlete.entities.WorkoutSession.get(id);
    assert.equal(coros.athlete_id, profile.id);
    assert.equal(coros.source_provider, 'coros');
    assert.match(coros.provider_activity_id, /^\d+:\d+$/);
    assert.ok(await denied(() => other.functions.invoke('corosRecording', { action: 'read_recording', workout_id: id })));
    const invoke = async (action, response_mode) => (await athlete.functions.invoke('corosRecording', { action, workout_id: id, response_mode })).data;
    const retrieved = await invoke('recover_recording');
    assert.equal(retrieved.status, 'verified');
    assert.equal(retrieved.recording_sha256, expectedSha256);
    assert.equal(retrieved.sample_count, expectedCount);
    assert.equal(retrieved.streams.length, expectedCount);
    assert.equal(retrieved.streams.at(-1)?.time, expectedEnd);
    assert.deepEqual(await invoke('read_recording'), retrieved);
    const analysis = await invoke('read_recording', 'analysis');
    assert.equal(analysis.recording_sha256, expectedSha256);
    assert.equal(analysis.analysis.coverage.sampleCount, expectedCount);
    assert.ok(analysis.analysis.windows[600].length > 0);
    assert.equal(analysis.streams, undefined);
    verified.push(check);
  }
} catch (error) {
  // Provider and SDK messages can contain sensitive request details.
  console.error(JSON.stringify({ failed: check, status: statusOf(error) ?? null, verified }));
  exitCode = 1;
} finally {
  for (const workout_id of fixtures) {
    try {
      const { data } = await athlete.functions.invoke('editWorkoutSession', { workout_id, action: 'delete' });
      assert.equal(data?.deleted, true);
    } catch {
      console.error('Could not remove a workout fixture from the staging test account.');
      exitCode = 1;
    }
  }
  if (!exitCode) console.log(JSON.stringify({ staging: appId, verified }));
  process.exitCode = exitCode;
}
