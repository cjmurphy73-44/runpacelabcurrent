import { describe, expect, it } from 'vitest';
import { assessDailyLoadCoverage, verifiedDailyLoadForAdaptation } from '../dailyLoadCoverage';

describe('daily load provenance for adaptation', () => {
  const range = { startDate: '2026-11-01', endDate: '2026-11-03' };

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
    expect(result.missingDates).toEqual(['2026-11-01']);
  });

  it('rejects invalid calendar ranges rather than rolling dates over', () => {
    expect(assessDailyLoadCoverage({ startDate: '2026-02-30', endDate: '2026-03-02' }).reason).toBe('invalid_range');
    expect(assessDailyLoadCoverage({ startDate: '2026-11-04', endDate: '2026-11-03' }).complete).toBe(false);
  });
});
