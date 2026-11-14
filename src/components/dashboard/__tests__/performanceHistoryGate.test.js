import { describe, expect, it } from 'vitest';
import { inspectPerformanceHistory } from '../performanceHistoryGate.js';

const day = (date, changes = {}) => ({
  date, total_trimp: 20, verified_trimp: 20, summary_trimp: 0,
  calculated_ctl: 10, calculated_atl: 15, calculated_tsb: -5, ...changes,
});

describe('performance history presentation gate', () => {
  it('accepts explicitly reconciled measured load', () => {
    expect(inspectPerformanceHistory([day('2026-11-12'), day('2026-11-13')]).ok).toBe(true);
  });
  it('withholds legacy unverified or summary-derived days', () => {
    expect(inspectPerformanceHistory([day('2026-11-12', { verified_trimp: undefined })]).ok).toBe(false);
    expect(inspectPerformanceHistory([day('2026-11-12', { verified_trimp: 10, summary_trimp: 10 })]).ok).toBe(false);
  });
  it('withholds missing, infinite or invalid model values', () => {
    for (const value of [null, undefined, NaN, Infinity]) {
      expect(inspectPerformanceHistory([day('2026-11-12', { calculated_tsb: value })]).ok).toBe(false);
    }
  });
  it('rejects invalid and duplicated dates', () => {
    expect(inspectPerformanceHistory([day('2026-02-30')]).ok).toBe(false);
    expect(inspectPerformanceHistory([day('2026-11-12'), day('2026-11-12')]).ok).toBe(false);
  });
  it('rejects mixed or mismatched load totals', () => {
    expect(inspectPerformanceHistory([day('2026-11-12', { total_trimp: 30 })]).ok).toBe(false);
    expect(inspectPerformanceHistory([day('2026-11-12', { total_trimp: -1 })]).ok).toBe(false);
  });
});
