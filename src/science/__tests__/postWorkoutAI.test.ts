import { describe, expect, it, vi } from 'vitest';
import { runPostWorkoutEvaluation } from '../../../base44/shared/postWorkoutAI';
import { buildAthleteStateSummary } from '../../../base44/shared/athleteState';
import { sendAthletePush } from '../../../base44/shared/pushNotifications';

vi.mock('../../../base44/shared/pushNotifications', () => ({ sendAthletePush: vi.fn(async () => {}) }));
vi.mock('../../../base44/shared/athleteState', () => ({
  buildAthleteStateSummary: vi.fn(async () => ({ athlete_id: 'private-athlete', load_state: { ctl: 15 } })),
}));

function client(saved = null) {
  let stored = saved;
  const InvokeLLM = vi.fn(async (_request: { prompt: string }) => ({ feedback: 'Steady aerobic effort.', intensity: 'easy' }));
  const entities = {
    WorkoutSession: { get: vi.fn(async () => ({ id: 'workout', athlete_id: 'private-athlete' })), update: vi.fn() },
    WorkoutFeedback: {
      filter: vi.fn(async () => stored ? [stored] : []),
      create: vi.fn(async data => (stored = { ...data, id: 'feedback-id' })),
    },
    CoachMessage: { create: vi.fn(async () => ({ id: 'coach-message' })) },
  };
  return { asServiceRole: { integrations: { Core: { InvokeLLM } }, entities } };
}

describe('post-workout AI evaluation reuse', () => {
  it('returns a saved result before querying load or calling the model', async () => {
    const saved = { id: 'feedback-id', status: 'complete', feedback: 'Previously saved coaching.' };
    const base44 = client(saved);
    expect(await runPostWorkoutEvaluation(base44, 'workout', 'private-athlete')).toMatchObject({ success: true, feedback: saved });
    expect(buildAthleteStateSummary).not.toHaveBeenCalled();
    expect(base44.asServiceRole.integrations.Core.InvokeLLM).not.toHaveBeenCalled();
  });

  it('coalesces concurrent calls, removes private identifiers from the prompt, and sends one notification', async () => {
    const base44 = client();
    const evaluate = () => runPostWorkoutEvaluation(base44, 'workout', 'private-athlete');
    const [first, second] = await Promise.all([evaluate(), evaluate()]);
    expect(first).toEqual(second);
    expect(await evaluate()).toMatchObject({ success: true, feedback: { id: 'feedback-id' } });
    const model = base44.asServiceRole.integrations.Core.InvokeLLM;
    expect(model).toHaveBeenCalledTimes(1);
    expect(model.mock.calls[0][0].prompt).toContain('"ctl":15');
    expect(model.mock.calls[0][0].prompt).not.toContain('private-athlete');
    expect(sendAthletePush).toHaveBeenCalledTimes(1);
  });
});
