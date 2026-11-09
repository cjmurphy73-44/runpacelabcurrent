import { describe, expect, it, vi } from 'vitest';
import { calculateHistoricalAndProjectedLoad, getTsbZoneInfo } from './loadForecasting';

describe('dashboard load forecast characterization', () => {
  it('returns no modeled history without dated sessions', () => {
    expect(calculateHistoricalAndProjectedLoad([], [], 0)).toEqual([]);
    expect(calculateHistoricalAndProjectedLoad([{ session_tss: 50 }], [], 0)).toEqual([]);
  });

  it('aggregates same-day sessions, seeds the first day, and decays across rest days', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-11-09T12:00:00Z'));
      const result = calculateHistoricalAndProjectedLoad([
        { date: '2026-11-07T07:00:00Z', session_tss: 30 },
        { date: '2026-11-07T17:00:00Z', session_tss: 20 },
      ], [], 0);
      expect(result.map(p => p.date)).toEqual(['2026-11-07', '2026-11-08', '2026-11-09']);
      expect(result[0]).toMatchObject({ dailyTss: 50, ctl: 50, atl: 50, tsb: 0, isProjected: false });
      const ctl = 50 * Math.exp(-1 / 42);
      const atl = 50 * Math.exp(-1 / 7);
      expect(result[1].ctl).toBeCloseTo(ctl, 1);
      expect(result[1].atl).toBeCloseTo(atl, 1);
      expect(result[1].tsb).toBeCloseTo(ctl - atl, 1);
      expect(result[2].dailyTss).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('distinguishes projected sessions from completed history', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-11-09T12:00:00Z'));
      const result = calculateHistoricalAndProjectedLoad(
        [{ date: '2026-11-09', session_tss: 40 }],
        [{ date: '2026-11-10', prescribed_duration_minutes: 60, prescribed_intensity_zone: 'z1' }],
        1,
      );
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ isProjected: false, dailyTss: 40 });
      expect(result[1]).toMatchObject({ isProjected: true, dailyTss: 24 });
    } finally {
      vi.useRealTimers();
    }
  });

  it('reports absent or non-finite TSB without claiming recovery', () => {
    for (const value of [null, undefined, Number.NaN, Infinity, -Infinity]) {
      const zone = getTsbZoneInfo(value);
      expect(zone.label).toBe('Unavailable');
      expect(zone.advice).toMatch(/Not enough reliable load data/);
    }
  });

  it('describes TSB bands without diagnosing injury or prescribing sessions', () => {
    expect(getTsbZoneInfo(16).label).toBe('Positive balance');
    expect(getTsbZoneInfo(-10).label).toBe('Near balance');
    expect(getTsbZoneInfo(-25).label).toBe('Negative balance');
    expect(getTsbZoneInfo(-26).label).toBe('Strongly negative balance');
    for (const value of [16, 0, -15, -30]) {
      const zone = getTsbZoneInfo(value);
      expect(zone.advice).not.toMatch(/high injury\/illness risk|good window for a hard effort|productive fatigue/i);
    }
  });
});
