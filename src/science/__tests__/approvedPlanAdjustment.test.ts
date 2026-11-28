import { describe, expect, it, vi } from 'vitest';
import { deriveApprovalSuggestion, handleApprovedPlanAdjustment }
  from '../../../base44/shared/approvedPlanAdjustment.ts';

vi.mock('../../../base44/shared/planGate.ts', () => ({
  assertPaidPlan: vi.fn(async () => ({ ok: true, plan: 'pro' })),
}));

const utc = (days: number) =>
  new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
function recorded(age: number, durationMinutes: number, id: string) {
  return { id, athlete_id: 'athlete-a', date: utc(-age), sport: 'running',
    duration_minutes: durationMinutes, session_trimp: 55, load_source: 'stream',
    load_coverage_pct: 94, avg_hr: 145, distance_km: 8 };
}
const history = [
  recorded(0, 70, 'a'), recorded(3, 70, 'b'),
  recorded(8, 40, 'c'), recorded(10, 40, 'd'),
];
function simulated(options: { user?: string | null; changed?: boolean;
  storageError?: boolean; foreign?: boolean; completed?: boolean;
  extraPlan?: boolean; insufficient?: boolean } = {}) {
  const owner = options.user === undefined ? 'user-a' : options.user;
  const athlete = { id: 'athlete-a', created_by_id: 'user-a' };
  const plan = { id: 'plan-a', athlete_id: athlete.id, status: 'active' };
  const session = { id: 'session-a', athlete_id: athlete.id,
    training_plan_id: plan.id, date: utc(1), sport: 'running',
    status: options.completed ? 'completed' : 'pending',
    prescribed_duration_minutes: 45, prescribed_intensity_zone: 'Z2',
    completed_workout_id: options.completed ? 'workout-done' : null,
    rationale_text: '' };
  const updates: any[] = [];
  const get = vi.fn(async () => options.foreign ? { ...session, athlete_id: 'athlete-b' } : { ...session });
  const update = vi.fn(async (_id: string, patch: Record<string, any>) => {
    if (options.storageError) throw new Error('unavailable');
    Object.assign(session, patch);
    updates.push(patch);
  });
  const entity = {
    User: { get: vi.fn(async () => ({ id: owner,
      data: { verified_athlete_profile_id: 'athlete-a' } })) },
    AthleteProfile: {
      get: vi.fn(async () => ({ ...athlete })),
      filter: vi.fn(async () => owner === 'user-a' ? [athlete] : []),
    },
    TrainingPlan: { filter: vi.fn(async () => options.extraPlan
      ? [plan, { ...plan, id: 'another' }] : [plan]) },
    TrainingPlanSession: { filter: vi.fn(async () => [{ ...session }]), get, update },
    WorkoutSession: { filter: vi.fn(async () => options.insufficient
      ? [recorded(0, 30, 'one')] : history) },
    DailyMetrics: { filter: vi.fn(async () => []) },
  };
  const base44 = {
    auth: { me: vi.fn(async () => owner ? { id: owner } : null) },
    asServiceRole: { entities: entity },
  };
  const post = (value: Record<string, unknown>) =>
    new Request('https://staging.test/approvedPlanAdjustment', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(value),
    });
  return { base44, entity, session, updates, post };
}

describe('athlete-approved evidence coaching', () => {
  it('proposes a bounded 10% reduction when independently observed weekly volumes rose', () => {
    const context = { state: 'observational_only', history: { state: 'available',
      confidence: 'observational_only', session_coverage: { history_truncated: false },
      recent_week: { workouts: 2, minutes: 140 },
      previous_week: { workouts: 2, minutes: 80 } } };
    const proposal = deriveApprovalSuggestion(context, {
      id: 'session-a', training_plan_id: 'plan-a', date: utc(1),
      sport: 'running', status: 'pending',
      prescribed_duration_minutes: 45, prescribed_intensity_zone: 'Z2',
    }, utc(0));
    expect(proposal).toMatchObject({
      state: 'proposal', original_duration_minutes: 45,
      proposed_duration_minutes: 41, requires_athlete_approval: true,
      evidence: { recent_workouts: 2, prior_workouts: 2 },
    });
    expect(JSON.stringify(proposal)).not.toMatch(/injury_probability|menstrual|fertility/);
  });

  it('previews without writes, then applies only after explicit athlete approval', async () => {
    const t = simulated();
    const preview = await handleApprovedPlanAdjustment(t.base44, t.post({ action: 'preview' }));
    expect(preview.status).toBe(200);
    const proposal = await preview.json();
    expect(proposal).toMatchObject({ state: 'proposal',
      requires_athlete_approval: true, applied: false });
    expect(t.updates).toHaveLength(0);
    const payload = { action: 'apply', approved: true,
      plan_id: proposal.plan_id, session_id: proposal.session_id,
      original_duration_minutes: proposal.original_duration_minutes,
      proposed_duration_minutes: proposal.proposed_duration_minutes,
      intensity_zone: proposal.intensity_zone };
    const denied = await handleApprovedPlanAdjustment(t.base44,
      t.post({ ...payload, approved: false }));
    expect(denied.status).toBe(400);
    expect(t.updates).toHaveLength(0);
    const confirmed = await handleApprovedPlanAdjustment(t.base44, t.post(payload));
    expect(confirmed.status).toBe(200);
    expect(await confirmed.json()).toMatchObject({ state: 'applied',
      prescribed_duration_minutes: 41 });
    expect(t.session.prescribed_intensity_zone).toBe('Z2');
    expect(t.session.status).toBe('pending');
    expect(t.updates).toHaveLength(1);
    const retry = await handleApprovedPlanAdjustment(t.base44, t.post(payload));
    expect(await retry.json()).toMatchObject({ state: 'already_applied' });
    expect(t.updates).toHaveLength(1);
  });

  it('never allows anonymous, foreign, or coach-only accounts to change a plan', async () => {
    for (const user of [null, 'coach-b']) {
      const t = simulated({ user });
      const r = await handleApprovedPlanAdjustment(t.base44,
        t.post({ action: 'preview' }));
      expect([401, 404]).toContain(r.status);
      expect(t.updates).toHaveLength(0);
      expect(t.entity.TrainingPlanSession.filter).not.toHaveBeenCalled();
    }
  });

  it('rejects stale, completed, ambiguous and insufficient-evidence changes', async () => {
    for (const options of [{ changed: true }, { completed: true },
      { extraPlan: true }, { insufficient: true }, { foreign: true }]) {
      const t = simulated(options);
      if (options.changed) t.session.prescribed_duration_minutes = 50;
      const r = await handleApprovedPlanAdjustment(t.base44,
        t.post({ action: 'apply', approved: true, plan_id: 'plan-a',
          session_id: 'session-a', original_duration_minutes: 45,
          proposed_duration_minutes: 41, intensity_zone: 'Z2' }));
      expect(r.status).toBe(409);
      expect(t.updates).toHaveLength(0);
    }
  });

  it('does not claim a successful write when storage is unavailable', async () => {
    const t = simulated({ storageError: true });
    const r = await handleApprovedPlanAdjustment(t.base44,
      t.post({ action: 'apply', approved: true, plan_id: 'plan-a',
        session_id: 'session-a', original_duration_minutes: 45,
        proposed_duration_minutes: 41, intensity_zone: 'Z2' }));
    expect(r.status).toBe(503);
    expect(t.session.prescribed_duration_minutes).toBe(45);
  });
});
