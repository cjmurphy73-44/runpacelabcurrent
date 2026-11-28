import { describe, expect, it, vi } from 'vitest';
import { buildPlanReview, handleAthletePlanReview } from
  '../../../base44/shared/athletePlanReview.ts';

vi.mock('../../../base44/shared/planGate.ts', () => ({
  assertPaidPlan: vi.fn(async () => ({ ok: true, plan: 'pro' })),
}));

const date = (offset: number) =>
  new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);
const workout = (id: string, daysAgo: number, minutes: number) => ({
  id, athlete_id: 'athlete-a', date: date(-daysAgo), sport: 'running',
  duration_minutes: minutes, session_trimp: 65, load_source: 'stream',
});
const history = [
  workout('w-a', 0, 80), workout('w-b', 4, 80),
  workout('w-c', 8, 40), workout('w-d', 11, 40),
];

function fixture(opts: { anonymous?: boolean; foreign?: boolean; done?: boolean;
  stale?: boolean; insufficient?: boolean; failWrite?: boolean;
  unverifiedWrite?: boolean } = {}) {
  const session = { id: 'session-a', athlete_id: 'athlete-a', training_plan_id: 'plan-a',
    date: date(1), sport: 'running', prescribed_duration_minutes: 50,
    prescribed_intensity_zone: 'Z2', status: opts.done ? 'completed' : 'pending',
    completed_workout_id: opts.done ? 'completed-w' : null,
    rationale_text: 'Easy aerobic base run; preserve original training rationale.',
    updated_date: '2026-11-28T05:00:00Z' };
  const calls = { updates: 0 };
  let readCount = 0;
  const getSession = vi.fn(async () => {
    readCount++;
    if (opts.stale && readCount >= 2) return { ...session, prescribed_duration_minutes: 60 };
    return { ...session };
  });
  const e = {
    User: { get: vi.fn(async () => ({ id: 'user-a',
      data: { verified_athlete_profile_id: 'athlete-a' } })) },
    AthleteProfile: { get: vi.fn(async () => ({
      id: 'athlete-a', created_by_id: opts.foreign ? 'different' : 'user-a',
    })), filter: vi.fn(async () => []) },
    TrainingPlan: { get: vi.fn(async () => ({
      id: 'plan-a', athlete_id: 'athlete-a', status: 'active',
    })) },
    TrainingPlanSession: { get: getSession,
      update: vi.fn(async (_id: string, patch: Record<string, any>) => {
        calls.updates++;
        if (opts.failWrite) throw new Error('storage offline');
        if (!opts.unverifiedWrite) Object.assign(session, patch);
      }) },
    WorkoutSession: { filter: vi.fn(async () =>
      opts.insufficient ? [workout('one', 0, 20)] : history) },
    DailyMetrics: { filter: vi.fn(async () => []) },
    AthleteHealthJournal: { filter: vi.fn(async () => { throw new Error('privacy leak'); }) },
    AthleteHealthConsent: { filter: vi.fn(async () => { throw new Error('privacy leak'); }) },
  };
  const base44 = { auth: { me: vi.fn(async () =>
    opts.anonymous ? null : { id: 'user-a' }) }, asServiceRole: { entities: e } };
  const post = (input: any) => new Request('https://staging.test/planReview', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const send = (data: any) => handleAthletePlanReview(base44, post(data));
  return { base44, session, e, calls, send };
}

describe('athlete-approved individualized coaching', () => {
  it('uses repeated two-week evidence and avoids unsupported medical conclusions', () => {
    const review = buildPlanReview({
      id: 'session-a', date: date(1), sport: 'running',
      prescribed_duration_minutes: 50, prescribed_intensity_zone: 'Z2',
    }, history, [], date(0));
    expect(review).toMatchObject({
      state: 'review_available',
      proposal: { old_duration_minutes: 50, proposed_duration_minutes: 45,
        intensity_zone: 'Z2' },
      context: { recent_workouts: 2, previous_week: 2, journal_used: false },
    });
    expect(JSON.stringify(review)).not.toMatch(/ovulation|menstrual|injury_probability/);
    const unknown = buildPlanReview({
      id: 'session-a', date: date(1), sport: 'running',
      prescribed_duration_minutes: 50,
    }, [workout('one', 0, 25)], [], date(0));
    expect(unknown.state).toBe('insufficient_evidence');
  });

  it('separates read-only preview from explicit, validated, one-record approval', async () => {
    const f = fixture();
    const preview = await f.send({ action: 'preview', session_id: 'session-a' });
    expect(preview.status).toBe(200);
    const p = await preview.json();
    expect(p).toMatchObject({ state: 'review_available', read_only: true, applied: false });
    expect(f.calls.updates).toBe(0);
    const noConsent = await f.send({ action: 'apply', session_id: 'session-a',
      snapshot: p.proposal.snapshot, proposed_duration_minutes: 45 });
    expect(noConsent.status).toBe(409);
    expect(f.calls.updates).toBe(0);
    const input = { action: 'apply', session_id: 'session-a',
      confirm: 'APPLY_REVIEWED_REDUCTION', snapshot: p.proposal.snapshot,
      proposed_duration_minutes: p.proposal.proposed_duration_minutes };
    const applied = await f.send(input);
    expect(applied.status).toBe(200);
    expect(await applied.json()).toMatchObject({ applied: true, duration_minutes: 45 });
    expect(f.session).toMatchObject({ prescribed_duration_minutes: 45,
      prescribed_intensity_zone: 'Z2', status: 'pending',
      rationale_text: 'Easy aerobic base run; preserve original training rationale.',
      approved_adjustment_previous_duration_minutes: 50,
      approved_adjustment_snapshot: p.proposal.snapshot,
    });
    expect(Date.parse(f.session.approved_adjustment_at)).not.toBeNaN();
    expect(f.calls.updates).toBe(1);
    const retry = await f.send(input);
    expect(retry.status).toBe(200);
    expect(await retry.json()).toMatchObject({ applied: true, already_applied: true });
    expect(f.calls.updates).toBe(1);
    expect(f.e.AthleteHealthJournal.filter).not.toHaveBeenCalled();
    expect(f.e.AthleteHealthConsent.filter).not.toHaveBeenCalled();
  });

  it('denies anonymous, foreign, completed, stale or insufficient-evidence requests without writes', async () => {
    const cases = [{ anonymous: true }, { foreign: true }, { done: true },
      { stale: true }, { insufficient: true }];
    for (const options of cases) {
      const f = fixture(options);
      const preview = await f.send({ action: 'preview', session_id: 'session-a' });
      if (options.stale) {
        expect(preview.status).toBe(200);
        const proposal = (await preview.json()).proposal;
        const applied = await f.send({ action: 'apply', session_id: 'session-a',
          confirm: 'APPLY_REVIEWED_REDUCTION', snapshot: proposal.snapshot,
          proposed_duration_minutes: proposal.proposed_duration_minutes });
        expect(applied.status).toBe(409);
      } else if (options.insufficient) {
        expect((await preview.json()).state).toBe('insufficient_evidence');
      } else expect([401, 404, 409]).toContain(preview.status);
      expect(f.calls.updates).toBe(0);
    }
  });

  it('does not overwrite a newer session rationale while applying a stale preview', async () => {
    const f = fixture();
    const p = (await (await f.send({ action: 'preview', session_id: 'session-a' })).json()).proposal;
    f.session.rationale_text = 'Coach replaced the easy session with a different rationale.';
    const applied = await f.send({ action: 'apply', session_id: 'session-a',
      confirm: 'APPLY_REVIEWED_REDUCTION', snapshot: p.snapshot,
      proposed_duration_minutes: p.proposed_duration_minutes });
    expect(applied.status).toBe(409);
    expect(f.calls.updates).toBe(0);
    expect(f.session.rationale_text).toContain('Coach replaced');
  });

  it('rejects further modifications after an existing approved adjustment', async () => {
    const f=fixture();
    f.session.approved_adjustment_snapshot='previous-independent-approval';
    const result=await f.send({ action: 'preview', session_id:'session-a' });
    expect(result.status).toBe(409);
    expect(f.calls.updates).toBe(0);
  });

  it('does not falsely acknowledge failed or unverified writes', async () => {
    for (const options of [{ failWrite: true }, { unverifiedWrite: true }]) {
      const f = fixture(options);
      const preview = await (await f.send({ action: 'preview', session_id: 'session-a' })).json();
      const applied = await f.send({ action: 'apply', session_id: 'session-a',
        confirm: 'APPLY_REVIEWED_REDUCTION', snapshot: preview.proposal.snapshot,
        proposed_duration_minutes: preview.proposal.proposed_duration_minutes });
      expect(applied.status).toBe(503);
      expect(f.session.prescribed_duration_minutes).toBe(50);
    }
  });
});
