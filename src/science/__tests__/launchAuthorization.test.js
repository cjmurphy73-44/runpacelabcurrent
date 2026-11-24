import { build } from 'esbuild';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const athleteId = 'athlete-fixture';
const owner = { id: 'owner-fixture', role: 'user' };
const coach = { id: 'coach-fixture', role: 'coach' };
const unrelated = { id: 'unrelated-fixture', role: 'user' };
const otherCoach = { id: 'unassigned-fixture', role: 'coach' };
const testDate = new Date();
testDate.setHours(0, 0, 0, 0);
const day = testDate.toISOString().slice(0, 10);
const authorized = {
  coach_user_id: coach.id, athlete_profile_id: athleteId, status: 'active', authorization_source: 'admin_reviewed',
};
const draft = {
  id: 'plan-fixture', athlete_id: athleteId, created_by_id: owner.id, status: 'draft',
  plan_title: 'Fixture plan',
  weekly_plans: [{ week_number: 1, days: [{ date: day, sport: 'running', session_type: 'rest' }] }],
};
const bundles = new Map();

async function invoke(name, base44, body) {
  if (!bundles.has(name)) {
    bundles.set(name, build({
      entryPoints: [`base44/functions/${name}/entry.ts`],
      bundle: true, write: false, platform: 'node', format: 'iife',
      plugins: [{
        name: 'test-base44-client',
        setup(builder) {
          builder.onResolve({ filter: /^npm:@base44\/sdk@/ }, () => ({ path: 'sdk', namespace: 'fixture' }));
          builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({
            contents: 'export function createClientFromRequest() { return globalThis.base44; }',
          }));
        },
      }],
    }).then(result => result.outputFiles[0].text));
  }
  let handler;
  runInNewContext(await bundles.get(name), {
    base44, Request, Response, TextDecoder,
    console: { error: vi.fn(), warn: vi.fn(), log: vi.fn() },
    Deno: { serve: fn => { handler = fn; }, env: { get: () => undefined } },
  });
  return handler(new Request('https://staging.example.test/function', { method: 'POST', body: JSON.stringify(body) }));
}

function fixture(user, grant) {
  const entities = {
    AthleteProfile: {
      get: vi.fn(async id => id === athleteId ? { id: athleteId, created_by_id: owner.id } : null),
      update: vi.fn(async () => ({})),
    },
    CoachAthleteAssignment: { filter: vi.fn(async () => grant ? [grant] : []) },
    Subscription: { filter: vi.fn(async () => [{ plan: 'coach_pro', status: 'trialing' }]) },
    WorkoutSession: { filter: vi.fn(async () => []) },
    PhysiologicalBaselines: { filter: vi.fn(async () => []) },
    DailyMetrics: { filter: vi.fn(async () => []) },
    TrainingPlan: {
      get: vi.fn(async id => id === draft.id ? draft : null),
      create: vi.fn(async value => ({ ...value, id: 'draft-fixture' })),
      filter: vi.fn(async () => []),
      update: vi.fn(async (id, value) => ({ id, ...value })),
    },
    TrainingPlanSession: {
      get: vi.fn(async () => ({ id: 'session-fixture', athlete_id: athleteId, status: 'completed' })),
      filter: vi.fn(async () => []),
      create: vi.fn(async row => ({ ...row, id: 'new-session-fixture' })),
      bulkCreate: vi.fn(async () => ({})),
      bulkUpdate: vi.fn(async () => ({})),
    },
    BetaFeedback: { filter: vi.fn(async () => []), create: vi.fn(async () => ({ id: 'feedback-fixture' })) },
  };
  const InvokeLLM = vi.fn(async () => draft);
  const connector = vi.fn(() => { throw Error('Unexpected outside connector'); });
  return {
    auth: { me: vi.fn(async () => user) },
    integrations: { Core: { InvokeLLM } },
    asServiceRole: { entities, integrations: { Core: { InvokeLLM } }, connectors: { getConnection: connector } },
  };
}

const functions = [
  ['generateTrainingPlan', { athlete_id: athleteId }],
  ['commitTrainingPlan', { plan_id: draft.id }],
  ['requestMicroadjustment', { athlete_id: athleteId }],
  ['generateRaceStrategy', { athlete_id: athleteId, event_type: '5K' }],
  ['refreshTelemetryState', { athlete_id: athleteId }],
  ['autoReplanOnDeviation', { session_id: 'session-fixture' }],
];

describe.each(functions)('%s authorization', (name, payload) => {
  it.each([
    ['owner', owner, null],
    ['approved coach', coach, authorized],
  ])('allows the %s', async (_role, user, grant) => {
    const base44 = fixture(user, grant);
    expect((await invoke(name, base44, payload)).status).toBe(200);
  });

  it.each([
    ['anonymous', null, null, 401],
    ['unrelated athlete', { ...unrelated, athlete_profile_id: athleteId, data: { coached_athletes: [athleteId] } }, null, 404],
    ['unassigned coach', otherCoach, authorized, 404],
    ['legacy unapproved coach', coach, { ...authorized, authorization_source: undefined }, 404],
    ['revoked coach', coach, { ...authorized, status: 'archived' }, 404],
  ])('denies the %s before protected reads, cost or mutation', async (_role, user, grant, expected) => {
    const base44 = fixture(user, grant);
    const result = await invoke(name, base44, payload);
    expect(result.status).toBe(expected);
    const { entities } = base44.asServiceRole;
    expect(entities.Subscription.filter).not.toHaveBeenCalled();
    expect(entities.WorkoutSession.filter).not.toHaveBeenCalled();
    expect(entities.TrainingPlanSession.filter).not.toHaveBeenCalled();
    expect(entities.AthleteProfile.update).not.toHaveBeenCalled();
    expect(entities.TrainingPlan.create).not.toHaveBeenCalled();
    expect(entities.TrainingPlan.update).not.toHaveBeenCalled();
    expect(entities.TrainingPlanSession.bulkCreate).not.toHaveBeenCalled();
    expect(entities.TrainingPlanSession.bulkUpdate).not.toHaveBeenCalled();
    expect(base44.integrations.Core.InvokeLLM).not.toHaveBeenCalled();
    expect(base44.asServiceRole.connectors.getConnection).not.toHaveBeenCalled();
    if (!user) expect(entities.AthleteProfile.get).not.toHaveBeenCalled();
  });
});

describe('public endpoint protections', () => {
  it.each(['inviteAthlete', 'acceptInvite', 'logBetaFeedback', 'logErrorToAirtable'])('requires an authenticated user for %s', async name => {
    const base44 = fixture(null);
    expect((await invoke(name, base44, { message: 'test' })).status).toBe(401);
    expect(base44.asServiceRole.entities.BetaFeedback.create).not.toHaveBeenCalled();
    expect(base44.asServiceRole.connectors.getConnection).not.toHaveBeenCalled();
  });

  it.each(['inviteAthlete', 'acceptInvite'])('retires unused stub %s', async name => {
    expect((await invoke(name, fixture(owner), {})).status).toBe(410);
  });

  it('rejects invalid or over-limit feedback and stamps valid submissions with the session identity', async () => {
    const base44 = fixture(owner);
    const feedback = base44.asServiceRole.entities.BetaFeedback;
    expect((await invoke('logBetaFeedback', base44, { feedback_type: 'bug', message: {} })).status).toBe(400);
    expect((await invoke('logBetaFeedback', base44, { feedback_type: 'bug', message: 'é'.repeat(9000) })).status).toBe(400);
    expect((await invoke('logBetaFeedback', base44, { feedback_type: 'billing', message: 'A question', created_by_id: 'other' })).status).toBe(200);
    expect(feedback.create).toHaveBeenCalledWith(expect.objectContaining({ submitted_by_user_id: owner.id, feedback_type: 'billing' }));
    feedback.filter.mockResolvedValue(Array.from({ length: 5 }, () => ({})));
    expect((await invoke('logBetaFeedback', base44, { feedback_type: 'bug', message: 'rate limit' })).status).toBe(429);
    expect(feedback.create).toHaveBeenCalledTimes(1);
  });

  it('accepts authenticated diagnostics without contacting Airtable', async () => {
    const base44 = fixture(owner);
    expect((await invoke('logErrorToAirtable', base44, { message: 'Error: fixture crash' })).status).toBe(200);
    expect(base44.asServiceRole.connectors.getConnection).not.toHaveBeenCalled();
  });
});

it('creates a manual session only for the authorized active plan and derives its athlete', async () => {
  const payload = { training_plan_id: draft.id, date: day, sport: 'running', prescribed_duration_minutes: 20, athlete_id: 'ignored' };
  for (const [user, expected] of [[unrelated, 404], [owner, 200]]) {
    const base44 = fixture(user);
    const { TrainingPlan, TrainingPlanSession } = base44.asServiceRole.entities;
    TrainingPlan.get.mockResolvedValue({ ...draft, status: 'active' });
    expect((await invoke('createTrainingPlanSession', base44, payload)).status).toBe(expected);
    if (expected === 404) expect(TrainingPlanSession.create).not.toHaveBeenCalled();
    else expect(TrainingPlanSession.create).toHaveBeenCalledWith(expect.objectContaining({
      athlete_id: athleteId, training_plan_id: draft.id, status: 'pending',
    }));
  }
});
