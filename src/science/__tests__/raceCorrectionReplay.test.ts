import { describe, expect, it } from 'vitest';
import { createCorrectionReplayService } from '../../../infra/race-d1/correctionReplay';

const command = { ownerId: 'athlete-a', id: 'race-1', requestKey: 'request-1234567890',
  expectedRevision: 1, race: { race_date: '2026-11-01', sport: 'running', distance_m: 5000, elapsed_seconds: 1200 } };
describe('correction replay contract', () => {
  it('rejects a provider without a single atomic operation', () => {
    expect(() => createCorrectionReplayService({ correctIfRevision() {} }))
      .toThrow('atomic_correction_provider_required');
  });
  it('delegates exactly once with immutable input semantics', async () => {
    let count = 0;
    const service = createCorrectionReplayService({ async correctAndRecordAtomically(c) {
      count++;
      return { id: c.id, revision: 2 };
    } });
    expect(await service.correct(command)).toEqual({ id: 'race-1', revision: 2 });
    expect(count).toBe(1);
  });
  it('rejects missing revision and weak request key', async () => {
    const service = createCorrectionReplayService({ correctAndRecordAtomically: async () => null });
    await expect(service.correct({ ...command, expectedRevision: 0 })).rejects.toThrow('invalid_correction_request');
    await expect(service.correct({ ...command, requestKey: 'short' })).rejects.toThrow('invalid_correction_request');
  });
});
