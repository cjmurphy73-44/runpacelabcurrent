import { describe, expect, it } from 'vitest';
import { classifySessionLoad, classifyDailySessionLoads } from '../sessionLoadAdapter.js';

describe('legacy session load adapter (read-only)', () => {
  it('keeps a legacy TRIMP summary labelled as an estimate', () => {
    expect(classifySessionLoad({ session_trimp: 35 })).toEqual({
      ok: true, metric: 'trimp', value: 35, provenance: 'summary_estimate',
    });
  });
  it('does not trust stream labels without independent verification', () => {
    expect(classifySessionLoad({ session_trimp: 35, load_source: 'stream' }).reason)
      .toBe('unverified_provenance');
    expect(classifySessionLoad({ session_trimp: 35, load_source: 'stream', load_stream_verified: true }).provenance)
      .toBe('verified_stream');
  });
  it('rejects dual load fields, even when one is zero', () => {
    expect(classifySessionLoad({ session_trimp: 0, session_tss: 40 }).reason).toBe('ambiguous_metric');
  });
  it('does not merge TSS and TRIMP across sessions', () => {
    expect(classifyDailySessionLoads([{ session_trimp: 50 }, { session_tss: 40 }]).reason)
      .toBe('mixed_load_metrics');
  });
  it('rejects invalid and missing values rather than silently dropping sessions', () => {
    expect(classifyDailySessionLoads([{ session_trimp: 20 }, {}]).reason).toBe('missing_metric');
    expect(classifySessionLoad({ session_trimp: -2 }).ok).toBe(false);
    expect(classifySessionLoad({ session_tss: Infinity }).ok).toBe(false);
    expect(classifyDailySessionLoads([]).reason).toBe('no_loads');
  });
  it('separates verified and summary contributions for one metric', () => {
    expect(classifyDailySessionLoads([
      { session_trimp: 20, load_source: 'stream', load_stream_verified: true },
      { session_trimp: 30, load_source: 'summary' },
    ])).toMatchObject({ ok: true, metric: 'trimp', total: 50, verified: 20, summary: 30 });
  });
});
