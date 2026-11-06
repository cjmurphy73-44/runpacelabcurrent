import { describe, it, expect } from 'vitest';
import {
  evaluateAdaptation,
  buildLoadSeries,
  acuteChronicRatio,
  ctlRamp7d,
  tsbNegativeStreak,
  normalizeDailyLoads,
  ACWR_SPIKE_WARNING,
  HIGH_RAMP_RATE,
  OVERREACHING_RISK,
} from '../adaptation';

/** ISO dates walking back from a fixed day — keeps the tests timezone-free. */
function days(count: number, load: number, startOffset = 0): { date: string; load: number }[] {
  const start = Date.UTC(2026, 0, 1);
  return new Array(count).fill(0).map((_, i) => ({
    date: new Date(start + (i + startOffset) * 86_400_000).toISOString().slice(0, 10),
    load,
  }));
}

describe('adaptation: load series', () => {
  it('folds multiple sessions on the same day into one load point', () => {
    const merged = normalizeDailyLoads([
      { date: '2026-01-01', load: 40 },
      { date: '2026-01-01', load: 25 },
      { date: '2026-01-02', load: 30 },
    ]);
    expect(merged).toHaveLength(2);
    expect(merged[0].load).toBe(65);
  });

  it('sorts chronologically regardless of input order', () => {
    const merged = normalizeDailyLoads([
      { date: '2026-01-03', load: 10 },
      { date: '2026-01-01', load: 10 },
    ]);
    expect(merged.map((d) => d.date)).toEqual(['2026-01-01', '2026-01-03']);
  });

  it('builds a monotonic CTL on a constant load', () => {
    const series = buildLoadSeries(days(60, 50));
    expect(series[0].ctl).toBeLessThan(series[30].ctl);
    // CTL with a 42-day constant is still converging after 60 days of load.
    expect(series[59].ctl).toBeGreaterThan(35);
    expect(series[59].ctl).toBeLessThan(50);
    expect(series[59].tsb).toBeCloseTo(0, 0);
  });
});

describe('adaptation: ACWR', () => {
  it('sits near 1.0 on a stable chronic load', () => {
    const acwr = acuteChronicRatio(days(60, 50));
    expect(acwr).not.toBeNull();
    expect(acwr!).toBeGreaterThan(0.9);
    expect(acwr!).toBeLessThan(1.1);
  });

  it('returns null when the history is shorter than a week', () => {
    expect(acuteChronicRatio(days(5, 80))).toBeNull();
  });

  it('returns null rather than dividing by a near-zero chronic load', () => {
    expect(acuteChronicRatio(days(10, 0))).toBeNull();
  });

  it('flags a load spike above 1.5', () => {
    const history = [...days(40, 40), ...days(7, 200, 40)];
    const assessment = evaluateAdaptation(history);
    expect(assessment.acwr!).toBeGreaterThan(1.5);
    expect(assessment.flags).toContain(ACWR_SPIKE_WARNING);
  });

  it('does not flag a taper that drops the ratio', () => {
    const history = [...days(60, 60), ...days(10, 10, 60)];
    const assessment = evaluateAdaptation(history);
    expect(assessment.acwr!).toBeLessThan(1.5);
    expect(assessment.flags).not.toContain(ACWR_SPIKE_WARNING);
  });
});

describe('adaptation: CTL ramp rate', () => {
  it('flags more than 7 CTL points in 7 days', () => {
    const history = [...days(35, 20), ...days(14, 140, 35)];
    const assessment = evaluateAdaptation(history);
    expect(assessment.ctl_ramp_7d!).toBeGreaterThan(7);
    expect(assessment.flags).toContain(HIGH_RAMP_RATE);
  });

  it('stays quiet on a gradual ramp', () => {
    const history = days(60, 45);
    const assessment = evaluateAdaptation(history);
    expect(assessment.ctl_ramp_7d).toBeCloseTo(0, 1);
    expect(assessment.flags).not.toContain(HIGH_RAMP_RATE);
  });

  it('returns null ramp on a history shorter than eight days', () => {
    expect(ctlRamp7d(buildLoadSeries(days(5, 50)))).toBeNull();
  });
});

describe('adaptation: TSB form check', () => {
  it('counts a sustained negative streak', () => {
    const series = [
      { date: '2026-01-01', load: 0, ctl: 50, atl: 50, tsb: 0 },
      { date: '2026-01-02', load: 0, ctl: 50, atl: 60, tsb: -10 },
      { date: '2026-01-03', load: 0, ctl: 50, atl: 75, tsb: -25 },
      { date: '2026-01-04', load: 0, ctl: 51, atl: 85, tsb: -34 },
      { date: '2026-01-05', load: 0, ctl: 52, atl: 90, tsb: -38 },
      { date: '2026-01-06', load: 0, ctl: 53, atl: 92, tsb: -39 },
    ];
    expect(tsbNegativeStreak(series)).toBe(3);
  });

  it('breaks the streak on a recovery day', () => {
    const series = [
      { date: '2026-01-04', load: 0, ctl: 52, atl: 90, tsb: -38 },
      { date: '2026-01-05', load: 0, ctl: 52, atl: 90, tsb: -38 },
      { date: '2026-01-06', load: 0, ctl: 55, atl: 70, tsb: -15 },
    ];
    expect(tsbNegativeStreak(series)).toBe(0);
  });

  it('flags OVERREACHING_RISK after three days below -30', () => {
    const history = [...days(40, 40), ...days(7, 200, 40)];
    const assessment = evaluateAdaptation(history);
    expect(assessment.tsb_negative_streak_days).toBeGreaterThanOrEqual(3);
    expect(assessment.flags).toContain(OVERREACHING_RISK);
  });

  it('reports no flags for a healthy, stable block', () => {
    const assessment = evaluateAdaptation(days(70, 50));
    expect(assessment.flags).toEqual([]);
    expect(assessment.acwr).not.toBeNull();
  });

  it('is deterministic for identical input', () => {
    const history = [...days(40, 40), ...days(7, 200, 40)];
    expect(JSON.stringify(evaluateAdaptation(history))).toBe(JSON.stringify(evaluateAdaptation(history)));
  });
});