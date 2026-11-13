import { describe, expect, it } from 'vitest';
import { createScopedChunkStore, authorizeRecordingChunkScope } from '../../../base44/shared/recordingChunkStoreAdapter';
import type { ChunkRow } from '../../../base44/shared/recordingChunkPersistence';

const scope = { athlete_id: 'athlete-1', session_id: 'session-1' };
const sampleRow = (index: number): ChunkRow => ({
  ...scope, chunk_index: index, sample_count: 1, start_time_s: index,
  end_time_s: index, content_sha256: 'a'.repeat(64), samples: [{ time: index }],
});
const makeTransport = (rows: ChunkRow[], observed: Array<{ limit: number; offset: number }> = []) => ({
  fetchPage: async (requested: typeof scope, limit: number, offset: number) => {
    expect(requested).toEqual(scope);
    observed.push({ limit, offset });
    return rows.slice(offset, offset + limit);
  },
  createRows: async (batch: ChunkRow[]) => batch,
});

describe('bounded athlete/session chunk storage transport', () => {
  it('reads all 96 chunks without confusing a full page with completion', async () => {
    const seen: Array<{ limit: number; offset: number }> = [];
    const store = createScopedChunkStore(scope.athlete_id, scope.session_id,
      makeTransport(Array.from({ length: 96 }, (_, i) => sampleRow(i)), seen));
    const result = await store.listAll();
    expect(result).toMatchObject({ complete: true });
    expect(result.rows).toHaveLength(96);
    expect(seen.map(p => p.offset)).toEqual([0, 20, 40, 60, 80]);
  });
  it('requires a terminal page for exact page boundaries', async () => {
    const seen: Array<{ limit: number; offset: number }> = [];
    const store = createScopedChunkStore(scope.athlete_id, scope.session_id,
      makeTransport(Array.from({ length: 40 }, (_, i) => sampleRow(i)), seen));
    expect((await store.listAll()).complete).toBe(true);
    expect(seen.map(p => p.offset)).toEqual([0, 20, 40]);
  });
  it('fails closed on excessive, malformed, or cross-athlete page data', async () => {
    const overflow = createScopedChunkStore(scope.athlete_id, scope.session_id,
      makeTransport(Array.from({ length: 97 }, (_, i) => sampleRow(i))));
    expect((await overflow.listAll()).complete).toBe(false);
    const hostile = createScopedChunkStore(scope.athlete_id, scope.session_id, {
      fetchPage: async () => [{ ...sampleRow(0), athlete_id: 'other-athlete' }],
      createRows: async () => undefined,
    });
    expect(await hostile.listAll()).toEqual({ complete: false, rows: [] });
    const malformed = createScopedChunkStore(scope.athlete_id, scope.session_id, {
      fetchPage: async () => ({ rows: [sampleRow(0)] }),
      createRows: async () => undefined,
    });
    expect((await malformed.listAll()).complete).toBe(false);
  });
  it('rejects out-of-scope or oversized write batches before calling transport', async () => {
    let writes = 0;
    const store = createScopedChunkStore(scope.athlete_id, scope.session_id, {
      fetchPage: async () => [],
      createRows: async () => { writes++; },
    });
    await expect(store.createBatch([{ ...sampleRow(1), session_id: 'other' }])).rejects.toThrow();
    await expect(store.createBatch(Array.from({ length: 6 }, (_, i) => sampleRow(i)))).rejects.toThrow();
    await expect(store.createBatch([sampleRow(1)])).resolves.toBeUndefined();
    expect(writes).toBe(1);
  });
});

describe('authoritative athlete and session binding', () => {
  const athlete = { id: scope.athlete_id, created_by_id: 'owner' };
  const session = { id: scope.session_id, athlete_id: scope.athlete_id };
  const fetchAthlete = async () => athlete;
  const fetchSession = async () => session;
  it('accepts only owner or administrator with records bound to the same athlete', async () => {
    expect(await authorizeRecordingChunkScope({ id: 'owner' }, scope.athlete_id, scope.session_id, fetchAthlete, fetchSession)).toBe(true);
    expect(await authorizeRecordingChunkScope({ id: 'admin', role: 'admin' }, scope.athlete_id, scope.session_id, fetchAthlete, fetchSession)).toBe(true);
    expect(await authorizeRecordingChunkScope({ id: 'other' }, scope.athlete_id, scope.session_id, fetchAthlete, fetchSession)).toBe(false);
  });
  it('fails closed on session swap, missing identity and backend retrieval failure', async () => {
    expect(await authorizeRecordingChunkScope({ id: 'owner' }, scope.athlete_id, scope.session_id,
      fetchAthlete, async () => ({ ...session, athlete_id: 'other-athlete' }))).toBe(false);
    expect(await authorizeRecordingChunkScope(null, scope.athlete_id, scope.session_id, fetchAthlete, fetchSession)).toBe(false);
    expect(await authorizeRecordingChunkScope({ id: 'owner' }, scope.athlete_id, scope.session_id,
      async () => { throw Error('network'); }, fetchSession)).toBe(false);
  });
});
