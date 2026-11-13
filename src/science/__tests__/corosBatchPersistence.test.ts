import { describe, expect, it } from 'vitest';
import { persistCorosBatches } from '../../../base44/shared/corosBatchPersistence';

const rows = (n: number) => Array.from({ length: n }, (_, i) => ({ date: `2026-11-${String(i + 1).padStart(2, '0')}`, provider_activity_id: String(i), source_provider: 'coros', athlete_id: 'athlete-1' }));

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

  it('does not count unrelated returned rows or repeated echoes', async () => {
    const input = rows(2);
    const unrelated = { ...input[1], provider_activity_id: 'unrelated' };
    const res = await persistCorosBatches(input, async () => [input[0], input[0], unrelated]);
    expect(res.imported).toBe(1);
    expect(res.uncertain).toBe(1);
    expect(res.persisted_dates).toEqual([input[0].date]);
  });

  it('rejects a date-only echo without provider identity', async () => {
    const input = rows(1);
    const res = await persistCorosBatches(input, async () => [{ date: input[0].date }]);
    expect(res.imported).toBe(0);
    expect(res.uncertain).toBe(1);
    expect(res.persisted_dates).toEqual([]);
  });

  it('rejects a matching identity with a different saved date', async () => {
    const input = rows(1);
    const res = await persistCorosBatches(input, async () => [{ ...input[0], date: '2026-12-01' }]);
    expect(res.imported).toBe(0);
    expect(res.uncertain).toBe(1);
  });

  it('rejects invalid batch sizes', async () => {
    await expect(persistCorosBatches(rows(1), async (batch) => batch, 0)).rejects.toThrow(/Invalid batch size/);
  });
});
