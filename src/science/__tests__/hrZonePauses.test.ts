import { describe, expect, it } from 'vitest';
import { timeInZoneFromStream, resolveTimeInZone } from '../../../base44/shared/hrZones.ts';

describe('HR zone recording discontinuities', () => {
  const profile = { restHr: 60, maxHr: 180 };

  it('excludes a pause longer than 60 seconds instead of inventing a capped minute', () => {
    const result = timeInZoneFromStream([
      { time: 0, heart_rate: 120 },
      { time: 1, heart_rate: 120 },
      { time: 301, heart_rate: 120 },
      { time: 302, heart_rate: 120 },
    ], 60, 180);
    expect(result.total_seconds).toBe(2);
    expect(result.covered_seconds).toBe(2);
    expect(result.zone_seconds.reduce((a, b) => a + b, 0)).toBe(2);
  });

  it('preserves real intervals up to and including 60 seconds', () => {
    const result = timeInZoneFromStream([
      { time: 0, heart_rate: 120 },
      { time: 60, heart_rate: 120 },
      { time: 61, heart_rate: 120 },
    ], 60, 180);
    expect(result.total_seconds).toBe(61);
    expect(result.covered_seconds).toBe(61);
  });

  it('does not fabricate seconds for duplicate, reversed or invalid timestamps', () => {
    const result = timeInZoneFromStream([
      { time: 0, heart_rate: 120 },
      { time: 0, heart_rate: 120 },
      { time: -3, heart_rate: 120 },
      { time: Number.NaN, heart_rate: 120 },
      { time: 2, heart_rate: 120 },
    ], 60, 180);
    expect(result.total_seconds).toBe(0);
    expect(result.covered_seconds).toBe(0);
  });

  it('does not infer zones from two sparse heart-rate readings', () => {
    const result = resolveTimeInZone({
      stream: [{ time: 0, heart_rate: 140 }, { time: 1800, heart_rate: 140 }],
      durationSeconds: 1800, ...profile,
    });
    expect(result.zone_method).toBe('none');
    expect(result.zone_seconds).toEqual([0, 0, 0, 0, 0]);
    expect(result.coverage_pct).toBe(0);
  });

  it('does not change dense continuous sample accounting', () => {
    const stream = Array.from({ length: 121 }, (_, time) => ({ time, heart_rate: 120 }));
    const result = resolveTimeInZone({ stream, durationSeconds: 120, ...profile });
    expect(result.zone_method).toBe('stream');
    expect(result.zone_seconds.reduce((a, b) => a + b, 0)).toBe(120);
    expect(result.coverage_pct).toBe(100);
  });
});
