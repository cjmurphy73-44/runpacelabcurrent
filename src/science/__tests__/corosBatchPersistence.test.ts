import { describe, expect, it } from 'vitest';
import { persistCorosBatches, reconcileCorosWrites } from '../../../base44/shared/corosBatchPersistence';

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

describe('COROS read-after-write reconciliation', () => {
  it('separates confirmed rows from missing identities after complete read', async () => {
    const input = rows(3);
    const result = await reconcileCorosWrites(input, async () => ({ complete: true, rows: [input[0], input[2]] }));
    expect(result.retrySafe).toBe(true);
    expect(result.verified).toEqual([input[0], input[2]]);
    expect(result.missing).toEqual([input[1]]);
    expect(result.persisted_dates).toEqual([input[0].date, input[2].date]);
  });

  it('does not suggest retries after a failed or truncated read', async () => {
    const input = rows(2);
    const failed = await reconcileCorosWrites(input, async () => { throw new Error('timeout'); });
    expect(failed).toMatchObject({ retrySafe: false, missing: [], reason: 'read_after_write_failed' });
    const truncated = await reconcileCorosWrites(input, async () => ({ complete: false, rows: [] }));
    expect(truncated).toMatchObject({ retrySafe: false, missing: [], reason: 'read_after_write_unverified' });
  });

  it('refuses ambiguous provider IDs rather than risking duplicates', async () => {
    const input = rows(2);
    const duplicate = [{ ...input[0] }, { ...input[0] }];
    const result = await reconcileCorosWrites(duplicate, async () => ({ complete: true, rows: [] }));
    expect(result).toMatchObject({ retrySafe: false, missing: [], reason: 'invalid_or_duplicate_activity_identity' });
    const noId = await reconcileCorosWrites([{ date: '2026-11-01' }], async () => ({ complete: true, rows: [] }));
    expect(noId.retrySafe).toBe(false);
  });
});
