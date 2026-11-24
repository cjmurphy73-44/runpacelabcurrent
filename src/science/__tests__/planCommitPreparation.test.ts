import { describe, expect, it } from 'vitest';
import { prepareDraftPlanCommit } from '../../../base44/shared/planCommitPreparation';

const draft = {
  id: 'synthetic-plan',
  athlete_id: 'synthetic-athlete',
  plan_title: 'Synthetic training plan',
  weekly_plans: [{
    week_number: 1,
    days: [{
      date: '2026-11-16',
      session_type: 'training',
      sport: 'cycling',
      title: 'Easy ride',
      description: 'Low intensity',
      prescribed_duration_minutes: 40,
      prescribed_intensity_zone: 'easy',
    }],
  }],
};

describe('safe plan commit preparation', () => {
  it('rejects malformed drafts without producing any sessions', () => {
    expect(prepareDraftPlanCommit({ ...draft, weekly_plans: [] })).toMatchObject({
      valid: false, sessions: [],
    });
    expect(prepareDraftPlanCommit({
      ...draft,
      weekly_plans: [{ week_number: 1, days: [{ date: 'bad', sport: 'cycling', prescribed_duration_minutes: 40 }] }],
    }).sessions).toEqual([]);
  });

  it('materializes only validated non-rest sessions with the correct athlete and plan', () => {
    const result = prepareDraftPlanCommit({
      ...draft,
      weekly_plans: [{
        ...draft.weekly_plans[0],
        days: [
          ...draft.weekly_plans[0].days,
          { date: '2026-11-17', session_type: 'rest', sport: 'running' },
        ],
      }],
    });
    expect(result.valid).toBe(true);
    expect(result.sessions).toEqual([{
      training_plan_id: 'synthetic-plan',
      athlete_id: 'synthetic-athlete',
      date: '2026-11-16',
      sport: 'cycling',
      prescribed_duration_minutes: 40,
      prescribed_intensity_zone: 'easy',
      rationale_text: 'Easy ride — Low intensity',
      status: 'pending',
    }]);
  });

  it('normalizes sport labels and strength intensity returned by hosted plan generation', () => {
    const ride = draft.weekly_plans[0].days[0];
    const result = prepareDraftPlanCommit({
      ...draft,
      weekly_plans: [{
        week_number: 1,
        days: [
          { ...ride, sport: ' Running ', prescribed_intensity_zone: 'Z2' },
          { ...ride, date: '2026-11-17', sport: 'Strength', prescribed_intensity_zone: 'N/A' },
          { ...ride, date: '2026-11-18', session_type: 'REST', prescribed_intensity_zone: 'N/A' },
        ],
      }],
    });
    expect(result.valid).toBe(true);
    expect(result.sessions).toHaveLength(2);
    expect(result.sessions[0]).toMatchObject({ sport: 'running', prescribed_intensity_zone: 'Z2' });
    expect(result.sessions[1]).toMatchObject({ sport: 'strength', prescribed_intensity_zone: '' });
    const invalid = prepareDraftPlanCommit({
      ...draft,
      weekly_plans: [{ week_number: 1, days: [{ ...ride, sport: 'Running', prescribed_intensity_zone: 'N/A' }] }],
    });
    expect(invalid.valid).toBe(false);
  });
});

describe('schedule replacement', () => {
  it('keeps the current active plan and calendar intact when the replacement write fails', async () => {
    const { commitDraftPlan } = await import('../../../base44/shared/commitDraftPlan');
    const calls: string[] = [];
    const response = await commitDraftPlan({
      entities: {
        TrainingPlan: {
          filter: async () => { calls.push('read active'); return []; },
          update: async () => { calls.push('promote'); },
          bulkUpdate: async () => { calls.push('archive'); },
        },
        TrainingPlanSession: {
          filter: async () => [],
          bulkCreate: async () => { calls.push('create new'); throw new Error('unavailable'); },
          delete: async () => { calls.push('delete pending'); },
        },
      },
    }, draft);
    expect(response.status).toBe(502);
    expect(calls).toEqual(['create new']);
  });

  it('verifies the replacement before retiring pending sessions for the old plan', async () => {
    const { commitDraftPlan } = await import('../../../base44/shared/commitDraftPlan');
    const calls: string[] = [];
    const saved: any[] = [];
    const response = await commitDraftPlan({
      entities: {
        TrainingPlan: {
          filter: async () => [{ id: 'old-plan' }],
          update: async () => { calls.push('promote'); return { id: draft.id, status: 'active' }; },
          bulkUpdate: async () => { calls.push('archive old'); },
          get: async () => ({ status: 'archived' }),
        },
        TrainingPlanSession: {
          filter: async query => {
            if (query.status === 'pending') {
              expect(query.training_plan_id).toEqual({ $in: ['old-plan'] });
              return [{ id: 'old-pending', date: '2099-01-01' }];
            }
            return saved;
          },
          bulkCreate: async rows => { calls.push('create new'); saved.push(...rows); },
          delete: async id => { calls.push(`remove ${id}`); },
        },
      },
    }, draft);
    expect(await response.json()).toMatchObject({ success: true, previous_schedule_retired: true });
    expect(calls).toEqual(['create new', 'promote', 'archive old', 'remove old-pending']);
  });
});
