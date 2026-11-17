import { describe, expect, it } from 'vitest';
import { hasVerifiedStreams } from '../streamValidity.js';
import { isUsableTelemetry } from '../../../base44/shared/streamValidity.ts';

const make = (count, sample) => Array.from({ length: count }, (_, i) => ({ time: i, ...sample(i) }));
const check = (stream, expected) => {
  expect(hasVerifiedStreams({ streams: stream, duration_seconds: stream.length })).toBe(expected);
  expect(isUsableTelemetry(stream, stream.length)).toBe(expected);
};

describe('backend/frontend recording channel parity', () => {
  it('rejects alternating HR and power that never has a channel majority', () => {
    check(make(100, i => i < 49 ? { heart_rate: 140 } : i < 98 ? { power: 200 } : {}), false);
    check(make(100, i => i % 2 ? { heart_rate: 140 } : { power: 200 }), true);
  });
  it('accepts genuine majority HR and power independently', () => {
    check(make(100, i => i < 60 ? { heart_rate: 140 } : {}), true);
    check(make(100, i => i < 60 ? { power: 220 } : {}), true);
  });
  it('rejects nonfinite and string physiological samples', () => {
    check(make(100, i => i < 60 ? { heart_rate: Infinity, power: NaN } : {}), false);
    check(make(100, i => i < 60 ? { heart_rate: '150', power: '220' } : {}), false);
  });
  it('rejects sparse time spans and too-short streams', () => {
    check(make(59, () => ({ heart_rate: 140 })), false);
    const sparse = make(100, () => ({ heart_rate: 140 })).map(p => ({ ...p, time: p.time * 10 }));
    check(sparse, false);
  });
});
