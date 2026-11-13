import { describe, expect, it } from 'vitest';
import { toDateKey, calculateHistoricalAndProjectedLoad } from '../loadForecasting';

describe('forecast input integrity', () => {
  it('returns unavailable for invalid or rolled-over dates', () => {
    expect(toDateKey('not-a-date')).toBeNull();
    expect(toDateKey('2026-02-30')).toBeNull();
    expect(toDateKey(new Date(NaN))).toBeNull();
    expect(toDateKey('2026-02-28')).toBe('2026-02-28');
  });
  it('does not treat invalid load as zero or poison the model with NaN', () => {
    expect(calculateHistoricalAndProjectedLoad([
      { date: '2026-11-01', session_trimp: NaN },
      { date: '2026-11-02', session_trimp: -30 },
      { date: 'invalid', session_trimp: 30 },
    ], [], 0)).toEqual([]);
  });
  it('accepts explicit zero load while rejecting nonfinite forecast horizon', () => {
    const sessions = [{ date: '2026-11-01', session_trimp: 0 }];
    const points = calculateHistoricalAndProjectedLoad(sessions, [], 0);
    expect(points.length).toBeGreaterThan(0);
    expect(points[0].dailyTss).toBe(0);
    expect(calculateHistoricalAndProjectedLoad(sessions, [], Infinity)).toEqual([]);
  });
});
