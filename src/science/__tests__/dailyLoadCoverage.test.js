import { describe, expect, it } from 'vitest';
import { assessDailyLoadCoverage, verifiedDailyLoadForAdaptation, forecastVerifiedDailyLoad } from '../dailyLoadCoverage';

describe('daily load provenance for adaptation', () => {
  const range = { startDate: '2026-11-01', endDate: '2026-11-03', loadMetric: 'trimp' };

  it('blocks missing days, even when a provider sync was observed', () => {
    const result = assessDailyLoadCoverage({
      ...range, sessions: [{ date: '2026-11-01', session_trimp: 40 }],
      confirmedSyncDates: ['2026-11-02'],
    });
    expect(result.complete).toBe(false);
    expect(result.missingDates).toEqual(['2026-11-02', '2026-11-03']);
    expect(result.days[1]).toMatchObject({ status: 'unknown', load: null, syncObserved: true });
    expect(verifiedDailyLoadForAdaptation({ ...range, sessions: [{ date: '2026-11-01', session_trimp: 40 }] }).dailyLoads).toEqual([]);
  });

  it('distinguishes independently confirmed rest from recorded zero load', () => {
    const input = {
      ...range,
      sessions: [{ date: '2026-11-01', session_trimp: 40 }, { date: '2026-11-03', session_trimp: 0 }],
      confirmedRestDates: ['2026-11-02'],
    };
    expect(assessDailyLoadCoverage(input).days.map(d => d.status)).toEqual(['recorded', 'confirmed_rest', 'recorded']);
    expect(verifiedDailyLoadForAdaptation(input)).toMatchObject({
      eligible: true, dailyLoads: [{ date: '2026-11-01', load: 40 }, { date: '2026-11-02', load: 0 }, { date: '2026-11-03', load: 0 }],
    });
  });

  it('blocks invalid load even when another session is valid and rest is asserted', () => {
    const result = assessDailyLoadCoverage({
      ...range,
      sessions: [
        { date: '2026-11-01', session_trimp: 20 },
        { date: '2026-11-01', session_trimp: Number.NaN },
        { date: '2026-11-03', session_tss: 30 },
      ],
      confirmedRestDates: ['2026-11-01', '2026-11-02'],
    });
    expect(result.complete).toBe(false);
    expect(result.days[0]).toMatchObject({ status: 'invalid_load', load: null });
    expect(result.missingDates).toEqual(['2026-11-01', '2026-11-03']);
  });

  it('rejects invalid calendar ranges rather than rolling dates over', () => {
    expect(assessDailyLoadCoverage({ startDate: '2026-02-30', endDate: '2026-03-02' }).reason).toBe('invalid_range');
    expect(assessDailyLoadCoverage({ startDate: '2026-11-04', endDate: '2026-11-03' }).complete).toBe(false);
  });
});

describe('verified load forecast', () => {
  const input = {
    startDate: '2026-11-01', endDate: '2026-11-03', loadMetric: 'trimp',
    sessions: [{ date: '2026-11-01', session_trimp: 40 }, { date: '2026-11-03', session_trimp: 60 }],
    confirmedRestDates: ['2026-11-02'],
  };

  it('refuses projection with unknown history', () => {
    const result = forecastVerifiedDailyLoad({ ...input, confirmedRestDates: [] });
    expect(result).toMatchObject({ eligible: false, points: [], missingDates: ['2026-11-02'] });
  });

  it('produces a reproducible EWMA scenario with explicit future load', () => {
    const result = forecastVerifiedDailyLoad(input, { daysAhead: 2, futureDailyLoads: [{ date: '2026-11-04', load: 80 }] });
    expect(result.eligible).toBe(true);
    expect(result.points.map(p => [p.date, p.dailyLoad, p.isProjected])).toEqual([
      ['2026-11-01', 40, false], ['2026-11-02', 0, false], ['2026-11-03', 60, false],
      ['2026-11-04', 80, true], ['2026-11-05', 0, true],
    ]);
    expect(result.points.every(p => Number.isFinite(p.ctl) && Number.isFinite(p.atl) && Number.isFinite(p.tsb))).toBe(true);
  });

  it('rejects invalid future load and horizon', () => {
    expect(forecastVerifiedDailyLoad(input, { futureDailyLoads: [{ date: '2026-11-04', load: Infinity }] }).reason).toBe('invalid_planned_load');
    expect(forecastVerifiedDailyLoad(input, { daysAhead: 366 }).reason).toBe('invalid_horizon_or_history');
    expect(forecastVerifiedDailyLoad(input, { daysAhead: 2, futureDailyLoads: [{ date: '2026-11-03', load: 5 }] }).reason).toBe('invalid_planned_load');
    expect(forecastVerifiedDailyLoad(input, { daysAhead: 2, futureDailyLoads: [{ date: '2026-11-06', load: 5 }] }).reason).toBe('invalid_planned_load');
  });
});

describe('load metric isolation', () => {
  const base = {
    startDate: '2026-11-01', endDate: '2026-11-02',
    sessions: [
      { date: '2026-11-01', session_trimp: 35, session_tss: 70 },
      { date: '2026-11-02', session_tss: 45 },
    ],
  };

  it('refuses implicit TRIMP/TSS selection', () => {
    expect(assessDailyLoadCoverage(base).reason).toBe('load_metric_required');
    expect(forecastVerifiedDailyLoad(base).eligible).toBe(false);
  });

  it('does not silently substitute TSS when TRIMP is absent', () => {
    const result = assessDailyLoadCoverage({ ...base, loadMetric: 'trimp' });
    expect(result.complete).toBe(false);
    expect(result.missingDates).toEqual(['2026-11-02']);
    expect(result.days[0].load).toBe(35);
  });

  it('calculates an explicitly TSS-only history', () => {
    const result = forecastVerifiedDailyLoad({ ...base, loadMetric: 'tss' }, { daysAhead: 1 });
    expect(result.eligible).toBe(true);
    expect(result.loadMetric).toBe('tss');
    expect(result.points.map(p => p.dailyLoad)).toEqual([70, 45, 0]);
  });

  it('rejects invalid provenance collections', () => {
    expect(assessDailyLoadCoverage({ ...base, loadMetric: 'tss', sessions: null }).reason).toBe('invalid_evidence');
  });
});
