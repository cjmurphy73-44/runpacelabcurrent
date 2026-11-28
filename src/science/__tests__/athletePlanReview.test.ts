import { describe, expect, it, vi } from 'vitest';
import { buildPlanReview, handleAthletePlanReview } from '../../../base44/shared/athletePlanReview';

const today = () => new Date().toISOString().slice(0, 10);
const ago = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
const ownedSession = () => ({
  id: 's1', athlete_id: 'athlete-1', training_plan_id: 'plan-1',
  date: today(), sport: 'running', prescribed_duration_minutes: 60,
  prescribed_intensity_zone: 'Z2', status: 'pending',
});
function fixture(options: {
  authenticated?: boolean; owner?: boolean; paid?: boolean;
  insufficient?: boolean; foreignRow?: boolean; updateNoop?: boolean;
  session?: any; plan?: any;
} = {}) {
  let session = options.session ?? ownedSession();
  const workouts = options.insufficient ? [] : [0, 2, 4].map((age, i) => ({
    id: 'w' + i, athlete_id: options.foreignRow && i === 0 ? 'foreign' : 'athlete-1',
    date: ago(age), sport: 'running', duration_minutes: 40,
    session_trimp: 55, load_source: 'stream',
  }));
  const update = vi.fn(async (id: string, patch: any) => {
    if (!options.updateNoop) session = { ...session, ...patch };
    return { id };
  });
  const healthAccess = vi.fn(async () => { throw new Error('private journal must not be read'); });
  const base44 = {
    auth: { me: vi.fn(async () => options.authenticated === false ? null : { id: 'user-1' }) },
    asServiceRole: { entities: {
      User: { get: vi.fn(async () => ({ id: 'user-1', data: {} })) },
      AthleteProfile: {
        filter: vi.fn(async () => [{ id: 'athlete-1',
          created_by_id: options.owner === false ? 'someone-else' : 'user-1' }]),
      },
      Subscription: { filter: vi.fn(async () => options.paid === false ? [] : [{
        user_id: 'user-1', plan: 'pro', status: 'active',
        current_period_end: new Date(Date.now() + 86400000).toISOString(),
      }]) },
      TrainingPlanSession: { get: vi.fn(async () => session), update },
      TrainingPlan: { get: vi.fn(async () => options.plan ?? {
        id: 'plan-1', athlete_id: 'athlete-1', status: 'active',
      }) },
      WorkoutSession: { filter: vi.fn(async () => workouts) },
      DailyMetrics: { filter: vi.fn(async () => []) },
      AthleteHealthConsent: { filter: healthAccess },
      AthleteHealthJournal: { filter: healthAccess },
    } },
  };
  const send = async (body: any) => handleAthletePlanReview(base44,
    new Request('https://fixture.example/athletePlanReview', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }));
  return { base44, send, update, healthAccess, getSession: () => session };
}

describe('Sprint 4 athlete-approved coaching and plan changes', () => {
  it('provides an evidence-specific preview with no write or journal read', async () => {
    const e = fixture();
    const r = await e.send({ action: 'preview', session_id: 's1' });
    expect(r.status).toBe(200);
    expect(r.headers.get('Cache-Control')).toBe('private, no-store');
    const body = await r.json();
    expect(body).toMatchObject({
      state: 'review_available', applied: false, read_only: true,
      proposal: { session_id: 's1', old_duration_minutes: 60,
        proposed_duration_minutes: 54, intensity_zone: 'Z2' },
      context: { observed_days_28d: 3, journal_used: false },
    });
    expect(body.proposal.rationale).toContain('3 of 28');
    expect(e.update).not.toHaveBeenCalled();
    expect(e.healthAccess).not.toHaveBeenCalled();
    expect(JSON.stringify(body)).not.toMatch(/menstrual|pregnancy|injury_probability/);
  });

  it('requires a separate exact confirmation and only modifies one owned session', async () => {
    const e = fixture();
    const preview = await (await e.send({ action: 'preview', session_id: 's1' })).json();
    const denied = await e.send({ action: 'apply', session_id: 's1',
      snapshot: preview.proposal.snapshot, proposed_duration_minutes: 54 });
    expect(denied.status).toBe(409);
    expect(e.update).not.toHaveBeenCalled();
    const bad = await e.send({ action: 'apply', session_id: 's1',
      confirm: 'APPLY_REVIEWED_REDUCTION', snapshot: preview.proposal.snapshot,
      proposed_duration_minutes: 15 });
    expect(bad.status).toBe(409);
    const ok = await e.send({ action: 'apply', session_id: 's1',
      confirm: 'APPLY_REVIEWED_REDUCTION', snapshot: preview.proposal.snapshot,
      proposed_duration_minutes: 54 });
    expect(ok.status).toBe(200);
    expect(await ok.json()).toMatchObject({ applied: true, duration_minutes: 54 });
    expect(e.update).toHaveBeenCalledOnce();
    expect(e.update).toHaveBeenCalledWith('s1', {
      prescribed_duration_minutes: 54, status: 'modified',
      rationale_text: expect.stringContaining('Optional conservative'),
    });
    expect(e.getSession()).toMatchObject({ status: 'modified', prescribed_duration_minutes: 54,
      prescribed_intensity_zone: 'Z2' });
    expect((await e.send({ action: 'apply', session_id: 's1',
      confirm: 'APPLY_REVIEWED_REDUCTION', snapshot: preview.proposal.snapshot,
      proposed_duration_minutes: 54 })).status).toBe(409);
  });

  it('never changes a plan for anonymous, foreign, coach, or unpaid users', async () => {
    for (const options of [{ authenticated: false }, { owner: false }, { paid: false },
      { session: { ...ownedSession(), athlete_id: 'other-athlete' } }]) {
      const e = fixture(options);
      const response = await e.send({ action: 'preview', session_id: 's1' });
      expect([401, 402, 404, 409]).toContain(response.status);
      expect(e.update).not.toHaveBeenCalled();
    }
  });

  it('refuses incomplete evidence or wrong-owner provider rows', async () => {
    const missing = fixture({ insufficient: true });
    const response = await missing.send({ action: 'preview', session_id: 's1' });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ state: 'insufficient_evidence', proposal: null });
    expect(missing.update).not.toHaveBeenCalled();
    const foreign = fixture({ foreignRow: true });
    expect((await foreign.send({ action: 'preview', session_id: 's1' })).status).toBe(503);
    expect(foreign.update).not.toHaveBeenCalled();
  });

  it('does not claim success when a storage update silently fails', async () => {
    const e = fixture({ updateNoop: true });
    const proposal = (await (await e.send({ action: 'preview', session_id: 's1' })).json()).proposal;
    const result = await e.send({ action: 'apply', session_id: 's1',
      confirm: 'APPLY_REVIEWED_REDUCTION', snapshot: proposal.snapshot,
      proposed_duration_minutes: proposal.proposed_duration_minutes });
    expect(result.status).toBe(503);
    expect(await result.json()).toMatchObject({ error: expect.any(String) });
  });

  it('derives an individual history explanation but no pseudo-clinical diagnosis', () => {
    const session = ownedSession();
    const insufficient = buildPlanReview(session, [], [], today());
    expect(insufficient).toMatchObject({ state: 'insufficient_evidence', proposal: null });
    expect(JSON.stringify(insufficient)).not.toContain('injury_probability');
  });
});
