import { describe, expect, it } from 'vitest';
import { persistCorosBatches } from '../../../base44/shared/corosBatchPersistence';

const rows = (n: number) => Array.from({ length: n }, (_, i) => ({ date: `2026-11-${String(i + 1).padStart(2, '0')}`, id: String(i) }));

describe('COROS persisted sync counts', () => {
  it('counts only confirmed returned records', async () => {
    const input = rows(3);
    const res = await persistCorosBatches(input, async (batch) => batch);
    expect(res.imported).toBe(3);
    expect(res.failed).toBe(0);
    expect(res.uncertain).toBe(0);
    expect(res.persisted_dates).toHaveLength(3);
  });

  it('keeps partial success when a later batch throws', async () => {
    const input = rows(3);
    let writes = 0;
    const res = await persistCorosBatches(input, async (batch) => {
      if (++writes === 2) throw new Error('rate limit');
      return batch;
    }, 2);
    expect(res.imported).toBe(2);
    expect(res.failed).toBe(1);
    expect(res.uncertain).toBe(1);
    expect(res.persisted_dates).toEqual(input.slice(0, 2).map((r) => r.date));
  });

  it('does not mark an unspecified response as fully saved', async () => {
    const res = await persistCorosBatches(rows(2), async () => undefined);
    expect(res.imported).toBe(0);
    expect(res.uncertain).toBe(2);
    expect(res.errors[0]).toMatch(/unverified/i);
  });

  it('reports a short bulk result rather than inventing successful rows', async () => {
    const input = rows(3);
    const res = await persistCorosBatches(input, async () => input.slice(0, 1));
    expect(res.imported).toBe(1);
    expect(res.uncertain).toBe(2);
    expect(res.persisted_dates).toEqual([input[0].date]);
  });

  it('rejects invalid batch sizes', async () => {
    await expect(persistCorosBatches(rows(1), async (batch) => batch, 0)).rejects.toThrow(/Invalid batch size/);
  });
});
