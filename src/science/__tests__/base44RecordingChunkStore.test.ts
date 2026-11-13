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
  const queries: any[] = [];
  const writes: ChunkRow[][] = [];
  return {
    records, queries, writes,
    entity: {
      async filter(query: typeof scope, options: { sort?: string; cursor?: string; limit: number }) {
        queries.push({ query, options });
        if (query.athlete_id !== athlete || query.session_id !== session) throw Error('cross-scope query');
        if (!options.cursor && options.sort !== 'chunk_index') throw Error('unstable sort');
        const offset = options.cursor ? Number(options.cursor.slice(2)) : 0;
        if (!Number.isSafeInteger(offset)) throw Error('bad cursor');
        const rows = records.slice(offset, offset + options.limit);
        const next = offset + rows.length;
        return {
          items: rows,
          has_more: next < records.length,
          next_cursor: next < records.length ? 'c:' + next : null,
        };
      },
      async bulkCreate(batch: ChunkRow[]) {
        writes.push(batch);
        records.push(...batch);
        records.sort((a,b) => a.chunk_index-b.chunk_index);
        return batch;
      },
    },
  };
}
async function prepared(count = 5041) {
  const samples = Array.from({length: count}, (_, time) => ({
    time, distance: time*4, heart_rate: 130+(time%30), power: time%15===0 ? 0 : 215,
  }));
  const planned = planRecordingChunks(samples);
  if (!planned.ok) throw Error('Invalid synthetic fixture');
  const result = await prepareRecordingManifest(athlete, session, planned.chunks, cryptoApi);
  if (!result) throw Error('Invalid synthetic manifest');
  return result;
}
describe('documented Base44 cursor entity adapter, synthetic SDK only', () => {
  it('completes a full 84-minute write and reads all 17 chunks back', async () => {
    const data = await prepared();
    const mock = makeEntity();
    const store = createBase44RecordingChunkStore(mock.entity, athlete, session);
    expect(await persistRecordingChunks(data, store, cryptoApi))
      .toMatchObject({status:'complete', verifiedChunks:17, attemptedChunks:17});
    expect(mock.writes.map(batch=>batch.length)).toEqual([5,5,5,2]);
    expect((await store.listAll()).rows).toHaveLength(17);
    const reconstructed = await readVerifiedRecording(scope, data.manifest, store.listAll, cryptoApi);
    expect(reconstructed).toMatchObject({ok:true, sample_count:5041, end_time_s:5040});
    expect(mock.queries.every(q=>q.query.athlete_id === athlete && q.query.session_id === session)).toBe(true);
  });
  it('requires exhaustive cursor reads through 96 chunks and blocks a 97th', async () => {
    const rows = (await prepared(28800)).rows;
    expect(rows).toHaveLength(96);
    const mock = makeEntity(rows);
    const store = createBase44RecordingChunkStore(mock.entity, athlete, session);
    expect((await store.listAll())).toMatchObject({complete:true});
    expect(mock.queries.slice(0,5).map(q=>q.options.cursor ?? null))
      .toEqual([null, 'c:20','c:40','c:60','c:80']);
    mock.records.push({ ...rows[0], chunk_index: 96 });
    expect(await store.listAll()).toEqual({complete:false, rows:[]});
  });
  it('fails closed on repeated cursor, malformed page, or cross-tenant row', async () => {
    const cases = [
      async () => ({ items:[{chunk_index:0, ...scope}], has_more:true, next_cursor:'dup' }),
      async () => ({items:[],has_more:true,next_cursor:'nonprogress'}),
      async () => ({items:[{chunk_index:0, ...scope}],has_more:false,next_cursor:'unexpected'}),
      async () => ({items:[{chunk_index:0, athlete_id:'other',session_id:session}],has_more:false,next_cursor:null}),
    ];
    for (const filter of cases) {
      const store = createBase44RecordingChunkStore({
        filter,
        bulkCreate: async () => [],
      }, athlete, session);
      // First case cycles cursor forever; must fail before completion.
      expect(await store.listAll()).toEqual({complete:false,rows:[]});
    }
  });
  it('blocks cross-scope, duplicate and oversized writes before the service-role call', async () => {
    const data = await prepared(601);
    const mock=makeEntity();
    const store = createBase44RecordingChunkStore(mock.entity, athlete, session);
    await expect(store.createBatch([{...data.rows[0], athlete_id:'other'}])).rejects.toThrow();
    await expect(store.createBatch([data.rows[0],data.rows[0]])).rejects.toThrow();
    await expect(store.createBatch([...data.rows,...data.rows])).rejects.toThrow();
    expect(mock.writes).toHaveLength(0);
  });
  it('is idempotent with verified readback against the mocked SDK', async () => {
    const data = await prepared(601);
    const mock = makeEntity();
    const store = createBase44RecordingChunkStore(mock.entity, athlete, session);
    await persistRecordingChunks(data, store, cryptoApi);
    const writes = mock.writes.length;
    expect(await persistRecordingChunks(data, store, cryptoApi))
      .toMatchObject({status:'complete', reason:'verified_existing', attemptedChunks:0});
    expect(mock.writes).toHaveLength(writes);
  });
});
