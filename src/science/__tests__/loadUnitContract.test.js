import { describe, expect, it } from 'vitest';
import { aggregateComparableLoads } from '../loadUnitContract';

describe('comparable training load contract', () => {
  const measured = { metric: 'trimp', provenance: 'verified_stream', value: 40 };
  it('preserves verified and summary provenance within the same metric', () => {
    expect(aggregateComparableLoads([measured, { metric: 'trimp', provenance: 'summary_hr', value: 60 }]))
      .toEqual({ ok: true, metric: 'trimp', total: 100, verified: 40, summary: 60, verifiedShare: 0.4 });
  });
  it('refuses to silently combine TSS and TRIMP', () => {
    expect(aggregateComparableLoads([measured, { metric: 'tss', provenance: 'summary_estimate', value: 30 }]))
      .toMatchObject({ ok: false, reason: 'mixed_load_metrics', total: null });
  });
  it('refuses missing, negative, nonfinite, and ambiguous values', () => {
    for (const value of [undefined, -1, NaN, Infinity, '25']) {
      expect(aggregateComparableLoads([{ ...measured, value }]).ok).toBe(false);
    }
    expect(aggregateComparableLoads([{ ...measured, provenance: 'unknown' }]).ok).toBe(false);
    expect(aggregateComparableLoads([]).reason).toBe('no_loads');
    expect(aggregateComparableLoads(null).reason).toBe('invalid_entries');
  });
  it('does not claim a verified percentage when all loads are zero', () => {
    expect(aggregateComparableLoads([{ ...measured, value: 0 }])).toMatchObject({
      ok: true, total: 0, verifiedShare: null,
    });
  });
  it('rejects numeric overflow rather than returning infinite load', () => {
    expect(aggregateComparableLoads([{ ...measured, value: 1e308 }, { ...measured, value: 1e308 }]).reason)
      .toBe('load_overflow');
  });
});
