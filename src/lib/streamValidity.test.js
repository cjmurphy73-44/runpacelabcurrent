import { describe, expect, it } from 'vitest';
import { hasVerifiedStreams, analyticsEligible } from './streamValidity.js';
import { isUsableTelemetry } from '../../base44/shared/streamValidity.ts';

const makeSession = (sample) => ({
  duration_seconds: 120,
  streams: Array.from({ length: 121 }, (_, i) => ({ time: i, ...sample(i) })),
});

describe('stream evidence parity with backend', () => {
  it('matches the backend gate for representative synthetic provider recordings', () => {
    const cases = [
      makeSession(() => ({ heart_rate: 140 })),
      makeSession(() => ({ power: 220 })),
      makeSession(i => i % 3 === 0 ? { heart_rate: 140 } : i % 3 === 1 ? { power: 220 } : {}),
      makeSession(() => ({ heart_rate: '140', power: 0 })),
      makeSession(i => ({ heart_rate: i % 2 === 0 ? 140 : null })),
      makeSession(i => ({ power: i % 2 === 0 ? 220 : null })),
    ];
    for (const session of cases) {
      expect(hasVerifiedStreams(session)).toBe(isUsableTelemetry(session.streams, session.duration_seconds));
    }
  });
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
  it('rejects non-finite heart rate and power as measured evidence in both gates', () => {
    for (const value of [Infinity, -Infinity, NaN]) {
      const session = makeSession(() => ({ heart_rate: value, power: value }));
      expect(hasVerifiedStreams(session)).toBe(false);
      expect(isUsableTelemetry(session.streams, session.duration_seconds)).toBe(false);
    }
    const valid = makeSession(() => ({ heart_rate: 145, power: 0 }));
    expect(hasVerifiedStreams(valid)).toBe(true);
    expect(isUsableTelemetry(valid.streams, valid.duration_seconds)).toBe(true);
  });
  it('rejects a large missing interval despite dense average sampling', () => {
    const session = makeSession(() => ({ heart_rate: 145 }));
    // 45 seconds missing in the middle; average spacing remains below 5s.
    session.streams = session.streams.map((point, i) => ({
      ...point,
      time: i + (i >= 60 ? 45 : 0),
    }));
    session.duration_seconds = 165;
    expect((session.streams.at(-1).time - session.streams[0].time) / (session.streams.length - 1)).toBeLessThan(5);
    expect(hasVerifiedStreams(session)).toBe(false);
    expect(isUsableTelemetry(session.streams, session.duration_seconds)).toBe(false);
  });
  it('keeps a 30-second telemetry pause eligible but rejects 31 seconds in both gates', () => {
    const recording = (gap) => {
      const session = makeSession(() => ({ heart_rate: 145 }));
      session.streams = session.streams.map((point, i) => ({
        ...point,
        time: i + (i >= 60 ? gap - 1 : 0),
      }));
      session.duration_seconds = 120 + gap - 1;
      return session;
    };
    for (const [gap, eligible] of [[30, true], [31, false]]) {
      const session = recording(gap);
      expect(hasVerifiedStreams(session)).toBe(eligible);
      expect(isUsableTelemetry(session.streams, session.duration_seconds)).toBe(eligible);
    }
  });
  it('accepts legitimate five-second sampled telemetry without inferring one-hertz coverage', () => {
    const session = {
      duration_seconds: 600,
      streams: Array.from({ length: 121 }, (_, i) => ({ time: i * 5, heart_rate: 140 })),
    };
    expect(hasVerifiedStreams(session)).toBe(true);
    expect(isUsableTelemetry(session.streams, session.duration_seconds)).toBe(true);
  });
  it('rejects sparse timestamps despite channel coverage', () => {
    const session = makeSession(() => ({ heart_rate: 140 }));
    session.streams = session.streams.map((p, i) => ({ ...p, time: i * 10 }));
    expect(hasVerifiedStreams(session)).toBe(false);
  });
});
