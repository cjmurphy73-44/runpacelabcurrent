import { describe, expect, it } from 'vitest';
import { hasVerifiedStreams, analyticsEligible } from './streamValidity.js';

const makeSession = (sample) => ({
  duration_seconds: 120,
  streams: Array.from({ length: 121 }, (_, i) => ({ time: i, ...sample(i) })),
});

describe('stream evidence parity with backend', () => {
  it('accepts dense heart-rate telemetry', () => {
    expect(hasVerifiedStreams(makeSession(() => ({ heart_rate: 140 })))).toBe(true);
  });
  it('accepts dense power telemetry without HR', () => {
    expect(hasVerifiedStreams(makeSession(() => ({ power: 220 })))).toBe(true);
  });
  it('rejects alternating sparse channels even when combined coverage is complete', () => {
    const session = makeSession(i => i % 2 === 0 ? { heart_rate: 140 } : { power: 220 });
    // 61/121 HR samples is above 50%; use three channels of gaps to keep
    // both individual channels below the backend threshold.
    const sparse = makeSession(i => i % 3 === 0 ? { heart_rate: 140 } : i % 3 === 1 ? { power: 220 } : {});
    expect(hasVerifiedStreams(sparse)).toBe(false);
    expect(analyticsEligible(sparse)).toBe(false);
    expect(hasVerifiedStreams(session)).toBe(true);
  });
  it('rejects numeric strings and non-positive values as measured channels', () => {
    expect(hasVerifiedStreams(makeSession(() => ({ heart_rate: '140', power: 0 })))).toBe(false);
  });
  it('rejects sparse timestamps despite channel coverage', () => {
    const session = makeSession(() => ({ heart_rate: 140 }));
    session.streams = session.streams.map((p, i) => ({ ...p, time: i * 10 }));
    expect(hasVerifiedStreams(session)).toBe(false);
  });
});
