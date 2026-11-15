import { describe, expect, it } from 'vitest';
import { deriveRunningThresholdPace } from '../../../base44/shared/thresholdPace.ts';

const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
const run = (overrides = {}) => ({
  date: yesterday, sport: 'running', duration_seconds: 2400,
  distance_km: 7.5, avg_hr: 145, ...overrides,
});

describe('running threshold pace intensity evidence gate', () => {
  it('does not infer a new threshold pace from an ordinary run without VDOT or LTHR', () => {
    const result = deriveRunningThresholdPace([run()], null, 3.7, null);
    expect(result).toMatchObject({
      paceMs: 3.7, source: 'Stored baseline', observedRunCount: 0,
    });
  });

  it('leaves threshold unavailable rather than learn from poor runs without an anchor', () => {
    const result = deriveRunningThresholdPace([run(), run({ distance_km: 5 })], null, null, null);
    expect(result.paceMs).toBeNull();
    expect(result.observedRunCount).toBe(0);
  });

  it('does not count correctly classified cycling toward a running threshold', () => {
    const result = deriveRunningThresholdPace([
      run({ sport: 'cycling', distance_km: 25, avg_hr: 160 }),
    ], null, 3.7, 160);
    expect(result).toMatchObject({
      paceMs: 3.7, observedRunCount: 0, recentCrossTrainCount: 1,
    });
  });

  it('still accepts a measured run at a supplied threshold HR', () => {
    const result = deriveRunningThresholdPace([run({ avg_hr: 162 })], null, 3.7, 160);
    expect(result.observedRunCount).toBe(1);
    // A single qualifying run without VDOT is not enough to replace a
    // stored threshold: the baseline remains stable until corroborated.
    expect(result.paceMs).toBe(3.7);
  });
});
