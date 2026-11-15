import { describe, expect, it } from 'vitest';
import { previewDailyLoad, previewLoadByDate } from '../../../base44/shared/dailyLoadPreview.ts';
describe('server-side daily load preview without writes', () => {
  it('separates summary from independently verified stream loads', () => {
    expect(previewDailyLoad([
      { session_trimp: 25, load_source: 'stream', load_stream_verified: true },
      { session_trimp: 15, load_source: 'summary' },
    ])).toEqual({ ok: true, metric: 'trimp', total: 40, verified: 25, summary: 15 });
  });
  it('refuses mixed metrics and dual-field records', () => {
    expect(previewDailyLoad([{ session_trimp: 10 }, { session_tss: 20 }]).reason).toBe('mixed_load_metrics');
    expect(previewDailyLoad([{ session_trimp: 0, session_tss: 5 }]).ok).toBe(false);
  });
  it('does not accept stream labels as proof', () => {
    expect(previewDailyLoad([{ session_trimp: 10, load_source: 'stream' }]).reason).toBe('unverified_stream');
  });
  it('fails closed on unknown, missing, and overflowing load', () => {
    expect(previewDailyLoad([{ session_trimp: 10 }, {}]).ok).toBe(false);
    expect(previewDailyLoad([{ session_trimp: Infinity }]).ok).toBe(false);
    expect(previewDailyLoad([{ session_trimp: 1e308 }, { session_trimp: 1e308 }]).reason).toBe('overflow');
  });
  it('groups dates without inventing zero-load days', () => {
    const days = previewLoadByDate([{ date: '2026-11-12', session_trimp: 12 }]);
    expect(days['2026-11-12']).toMatchObject({ ok: true, total: 12, summary: 12 });
    expect(days['2026-11-13']).toBeUndefined();
    expect(previewLoadByDate([{ date: 'bad', session_trimp: 12 }])._invalid.ok).toBe(false);
  });
});
