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
});
