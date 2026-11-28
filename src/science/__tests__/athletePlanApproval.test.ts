import { describe, expect, it, vi } from 'vitest';
import { coachEvidenceBrief } from '../../../base44/shared/coachEvidenceBrief';
import { buildCombinedAthleteUnderstanding } from '../../../base44/shared/athleteUnderstanding';
import { handleAthletePlanApproval, prepareAthletePlanProposal }
  from '../../../base44/shared/athletePlanApproval';

const date = '2026-11-30';
const planned = (more: Record<string, unknown> = {}) => ({
  id: 's-1', athlete_id: 'athlete-1', training_plan_id: 'p-1',
  date: '2026-12-01', status: 'pending', sport: 'running',
  prescribed_duration_minutes: 60, prescribed_intensity_zone: 'easy',
  updated_date: '2026-11-28T05:00:00Z', ...more,
});
function fixture(options: {
  loggedIn?: boolean; owner?: boolean; paid?: boolean; foreign?: boolean;
  active?: boolean; session?: any; failWrites?: boolean;
} = {}) {
  const user = { id: 'user-1', role: 'user' };
  let session = options.session ?? planned(options.foreign ? { athlete_id: 'athlete-2' } : {});
  let plan = { id: 'p-1', athlete_id: 'athlete-1', status: options.active === false ? 'archived' : 'active' };
  const update = vi.fn(async (_id: string, patch: any) => {
    if (options.failWrites) return {};
    session = { ...session, ...patch, updated_date: '2026-11-30T05:00:00Z' };
    return session;
  });
  const getSession = vi.fn(async () => session);
  const base44 = {
    auth: { me: vi.fn(async () => options.loggedIn === false ? null : user) },
    asServiceRole: { entities: {
      User: { get: vi.fn(async () => ({ id: user.id, data: {} })) },
      AthleteProfile: {
        filter: vi.fn(async () => options.owner === false ? [] :
          [{ id: 'athlete-1', created_by_id: user.id }]),
      },
      TrainingPlanSession: { get: getSession, update },
      TrainingPlan: { get: vi.fn(async () => plan) },
      Subscription: { filter: vi.fn(async () => options.paid === false ? [] :
        [{ plan: 'pro', status: 'active', current_period_end: '2027-01-01' }]) },
      AthleteHealthJournal: { filter: vi.fn(() => { throw new Error('Privacy breach'); }) },
    } },
  };
  const request = (data: object) => new Request('https://fixture.test/plan-approval', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
  });
  const run = (data: object, writesEnabled = false) =>
    handleAthletePlanApproval(base44, request(data), () => date, writesEnabled);
  return { run, update, getSession, setSession: (value: any) => { session = value; }, base44 };
}

describe('Sprint 4 deterministic coaching evidence', () => {
  it('never predicts injury or includes private reproductive-health details', () => {
    const r = buildCombinedAthleteUnderstanding([{
      id: 'run1', date: '2026-11-28', sport: 'running', athlete_id: 'a',
      duration_minutes: 60, load_source: 'summary', session_trimp: 70,
      period_started: true, journal_notes: 'private', 
    }], [], '2026-11-30');
    const summary = coachEvidenceBrief(r);
    expect(summary.state).toBe('observational_only');
    expect(summary.adjustments_allowed).toBe(false);
    expect(summary.health_journal_used).toBe(false);
    expect(JSON.stringify(summary)).not.toMatch(/journal_notes|period_started|private|injury_probability/i);
  });
  it('does not manufacture evidence when no athlete history is available', () => {
    expect(coachEvidenceBrief(null)).toMatchObject({
      state: 'unavailable', findings: [], adjustments_allowed: false,
    });
  });
});
describe('Sprint 4 explicit athlete plan approval', () => {
  it('returns only a conservative proposal for an upcoming pending session', () => {
    expect(prepareAthletePlanProposal(planned(), 10, date)).toMatchObject({
      state: 'preview_only', previous_duration_minutes: 60, proposed_duration_minutes: 54,
      requires_explicit_approval: true,
    });
    expect(prepareAthletePlanProposal(planned(), 20, date)).toMatchObject({
      state: 'preview_only', proposed_duration_minutes: 48,
    });
    for (const variant of [planned({status:'completed'}), planned({date:'2026-11-01'}),
      planned({date:'2027-01-05'}), planned({prescribed_duration_minutes: 900})]) {
      expect(prepareAthletePlanProposal(variant, 10, date).state).toBe('unavailable');
    }
    expect(prepareAthletePlanProposal(planned(), -10, date).state).toBe('unavailable');
  });
  it('denies anonymous, unrelated and inactive-plan requests without writes', async () => {
    for (const opt of [{loggedIn:false}, {owner:false}, {foreign:true}, {active:false}]) {
      const f=fixture(opt);
      const resp=await f.run({action:'preview',session_id:'s-1',reduction_percent:10});
      expect([401,404,409]).toContain(resp.status);
      expect(f.update).not.toHaveBeenCalled();
    }
  });
  it('previews without changing saved sessions and stays disabled by default', async () => {
    const f=fixture();
    const preview=await (await f.run({action:'preview',session_id:'s-1',reduction_percent:10})).json();
    expect(preview).toMatchObject({state:'preview_only',approval_available:false});
    const attempted=await f.run({action:'approve',session_id:'s-1',reduction_percent:10,
      expected_snapshot:preview.expected_snapshot,confirm:'APPLY'});
    expect(attempted.status).toBe(409);
    expect(f.update).not.toHaveBeenCalled();
  });
  it('requires explicit matching approval, paid access and rechecks the current session', async () => {
    const f=fixture();
    const data={action:'approve',session_id:'s-1',reduction_percent:10,
      confirm:'APPLY',expected_snapshot:'wrong'};
    expect((await f.run(data,true)).status).toBe(409);
    expect(f.update).not.toHaveBeenCalled();
    const p=await (await f.run({action:'preview',session_id:'s-1',reduction_percent:10},true)).json();
    expect(p.approval_available).toBe(true);
    f.setSession(planned({updated_date:'2026-11-30T01:00:00Z'}));
    expect((await f.run({...data,expected_snapshot:p.expected_snapshot},true)).status).toBe(409);
    expect(f.update).not.toHaveBeenCalled();
    const unpaid=fixture({paid:false});
    const pp=await (await unpaid.run({action:'preview',session_id:'s-1',reduction_percent:10},true)).json();
    expect((await unpaid.run({...data,expected_snapshot:pp.expected_snapshot},true)).status).toBe(402);
    expect(unpaid.update).not.toHaveBeenCalled();
  });
  it('writes one row only after athlete approval and verifies readback', async () => {
    const f=fixture();
    const preview=await (await f.run({action:'preview',session_id:'s-1',reduction_percent:20},true)).json();
    const response=await f.run({action:'approve',session_id:'s-1',reduction_percent:20,
      confirm:'APPLY',expected_snapshot:preview.expected_snapshot},true);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({state:'applied',prescribed_duration_minutes:48,
      athlete_approved:true});
    expect(f.update).toHaveBeenCalledExactlyOnceWith('s-1',{
      prescribed_duration_minutes:48,status:'modified',
    });
    // A repeated approval cannot reapply the same proposed adjustment.
    expect((await f.run({action:'approve',session_id:'s-1',reduction_percent:20,
      confirm:'APPLY',expected_snapshot:preview.expected_snapshot},true)).status).toBe(409);
    expect(f.update).toHaveBeenCalledOnce();
  });
  it('fails closed if an acknowledged write is not visible on readback', async () => {
    const f=fixture({failWrites:true});
    const preview=await (await f.run({action:'preview',session_id:'s-1',reduction_percent:10},true)).json();
    const res=await f.run({action:'approve',session_id:'s-1',reduction_percent:10,
      confirm:'APPLY',expected_snapshot:preview.expected_snapshot},true);
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({state:'unverified_write'});
  });
});
