import { describe, expect, it } from 'vitest';
import { webcrypto } from 'node:crypto';
import { createBase44RecordingChunkStore } from '../../../base44/shared/base44RecordingChunkStore';
import { planRecordingChunks } from '../../../base44/shared/recordingChunks';
import { prepareRecordingManifest } from '../../../base44/shared/recordingChunkManifest';
import { persistRecordingChunks, type ChunkRow } from '../../../base44/shared/recordingChunkPersistence';
import { readVerifiedRecording } from '../../../base44/shared/verifiedRecordingReadback';

const cryptoApi = webcrypto as unknown as Crypto;
const athlete = 'synthetic-athlete';
const session = 'synthetic-session';
const scope = { athlete_id: athlete, session_id: session };
function makeEntity(initial: ChunkRow[] = []) {
  const records = [...initial];
  const queries: Array<{ query: typeof scope; sort: string; limit: number; skip: number }> = [];
  const writes: ChunkRow[][] = [];
  return {
    records, queries, writes,
    entity: {
      async filter(query: typeof scope, sort: string, limit: number, skip: number) {
        queries.push({ query, sort, limit, skip });
        if (query.athlete_id !== athlete || query.session_id !== session ||
          sort !== 'chunk_index') throw Error('incorrect scope/sort');
        return records.slice(skip, skip + limit); // Base44 returns a plain array
      },
      async bulkCreate(batch: ChunkRow[]) {
        writes.push(batch);
        records.push(...batch);
        records.sort((a, b) => a.chunk_index - b.chunk_index);
        return batch;
      },
    },
  };
}
async function prepared(count = 5041) {
  const samples = Array.from({ length: count }, (_, time) => ({
    time, distance: time * 4, heart_rate: 130 + (time % 30), power: time % 15 === 0 ? 0 : 215,
  }));
  const planned = planRecordingChunks(samples);
  if (!planned.ok) throw Error('Invalid synthetic fixture');
  const result = await prepareRecordingManifest(athlete, session, planned.chunks, cryptoApi);
  if (!result) throw Error('Invalid synthetic manifest');
  return result;
}
describe('Base44 positional filter SDK adapter, staged only', () => {
  it('writes and verifies all 5041 samples with actual positional SDK calls', async () => {
    const data = await prepared();
    const mock = makeEntity();
    const store = createBase44RecordingChunkStore(mock.entity, athlete, session);
    expect(await persistRecordingChunks(data, store, cryptoApi))
      .toMatchObject({ status: 'complete', verifiedChunks: 17, attemptedChunks: 17 });
    expect(mock.writes.map(b => b.length)).toEqual([5, 5, 5, 2]);
    const reconstructed = await readVerifiedRecording(scope, data.manifest, store.listAll, cryptoApi);
    expect(reconstructed).toMatchObject({ ok: true, sample_count: 5041, end_time_s: 5040 });
    expect(mock.queries.every(q => q.query.athlete_id === athlete &&
      q.query.session_id === session && q.sort === 'chunk_index')).toBe(true);
  });
  it('reads maximum 96 rows with offset pages, and rejects 97th overflow', async () => {
    const rows = (await prepared(28800)).rows;
    expect(rows).toHaveLength(96);
    const mock = makeEntity(rows);
    const store = createBase44RecordingChunkStore(mock.entity, athlete, session);
    expect(await store.listAll()).toMatchObject({ complete: true });
    expect(mock.queries.slice(0, 5).map(q => q.skip)).toEqual([0, 20, 40, 60, 80]);
    mock.records.push({ ...rows[0], chunk_index: 96 });
    expect(await store.listAll()).toEqual({ complete: false, rows: [] });
  });
  it('queries the terminal empty page when row count is divisible by 20', async () => {
    const mock = makeEntity((await prepared(6000)).rows);
    const store = createBase44RecordingChunkStore(mock.entity, athlete, session);
    expect((await store.listAll()).complete).toBe(true);
    expect(mock.queries.map(q => q.skip)).toEqual([0, 20]);
  });
  it('fails closed on malformed, unsorted or cross-tenant responses', async () => {
    const raw = (await prepared(601)).rows;
    const bad = [
      async () => ({ items: raw }),
      async () => [{ ...raw[0], athlete_id: 'other' }],
      async () => [raw[1], raw[0]],
      async () => { throw Error('timeout'); },
    ];
    for (const filter of bad) {
      const store = createBase44RecordingChunkStore({ filter, bulkCreate: async () => [] }, athlete, session);
      expect(await store.listAll()).toEqual({ complete: false, rows: [] });
    }
  });
  it('refuses cross-scope, duplicates and oversized batches before invoking SDK', async () => {
    const data = await prepared(601);
    const mock = makeEntity();
    const store = createBase44RecordingChunkStore(mock.entity, athlete, session);
    await expect(store.createBatch([{ ...data.rows[0], athlete_id: 'other' }])).rejects.toThrow();
    await expect(store.createBatch([data.rows[0], data.rows[0]])).rejects.toThrow();
    await expect(store.createBatch([...data.rows, ...data.rows])).rejects.toThrow();
    expect(mock.writes).toHaveLength(0);
  });
  it('retries idempotently with complete readback using the same API interface', async () => {
    const data = await prepared(601);
    const mock = makeEntity();
    const store = createBase44RecordingChunkStore(mock.entity, athlete, session);
    await persistRecordingChunks(data, store, cryptoApi);
    const writes = mock.writes.length;
    expect(await persistRecordingChunks(data, store, cryptoApi))
      .toMatchObject({ status: 'complete', reason: 'verified_existing', attemptedChunks: 0 });
    expect(mock.writes).toHaveLength(writes);
  });
});
