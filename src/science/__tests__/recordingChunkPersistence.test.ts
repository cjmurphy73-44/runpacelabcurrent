import { describe, expect, it } from 'vitest';
import { webcrypto } from 'node:crypto';
import { planRecordingChunks } from '../../../base44/shared/recordingChunks';
import { prepareRecordingManifest } from '../../../base44/shared/recordingChunkManifest';
import { persistRecordingChunks, type ChunkRow } from '../../../base44/shared/recordingChunkPersistence';

const cryptoApi = webcrypto as unknown as Crypto;
const samples = (count = 901) => Array.from({ length: count }, (_, time) => ({
  time, heart_rate: 130 + time % 30, distance: time * 4, power: time % 10 === 0 ? 0 : 210,
}));
async function fixture(count = 901) {
  const planned = planRecordingChunks(samples(count));
  if (!planned.ok) throw Error('Synthetic planner rejected fixture');
  const prepared = await prepareRecordingManifest('owner-1', 'session-1', planned.chunks, cryptoApi);
  if (!prepared) throw Error('Synthetic manifest rejected fixture');
  return prepared;
}
function inMemory(initial: ChunkRow[] = []) {
  const saved = [...initial];
  const writes: number[] = [];
  return {
    saved,
    writes,
    store: {
      listAll: async () => ({ complete: true, rows: [...saved] }),
      createBatch: async (batch: ChunkRow[]) => {
        writes.push(batch.length);
        saved.push(...batch);
        return undefined; // API response does not assert persistence!
      },
    },
  };
}
describe('ING-010 safe readback-oriented chunk persistence', () => {
  it('saves an entire 84 minute recording and reports complete only after re-read', async () => {
    const prepared = await fixture(5041);
    const db = inMemory();
    const result = await persistRecordingChunks(prepared, db.store, cryptoApi);
    expect(result).toMatchObject({ status: 'complete', attemptedChunks: 17, verifiedChunks: 17 });
    expect(db.writes).toEqual([5, 5, 5, 2]);
    expect(db.saved[16].samples.at(-1).time).toBe(5040);
  });
  it('is idempotent when rerun and never rewrites already verified chunks', async () => {
    const prepared = await fixture();
    const db = inMemory();
    await persistRecordingChunks(prepared, db.store, cryptoApi);
    const count = db.writes.length;
    const result = await persistRecordingChunks(prepared, db.store, cryptoApi);
    expect(result).toMatchObject({ status: 'complete', reason: 'verified_existing', attemptedChunks: 0 });
    expect(db.writes).toHaveLength(count);
  });
  it('recovers only missing chunks after an ambiguous partial first write', async () => {
    const prepared = await fixture();
    const db = inMemory();
    let first = true;
    const original = db.store.createBatch;
    db.store.createBatch = async batch => {
      if (first) {
        first = false;
        db.saved.push(batch[0]); // partial commit, then request failed
        throw Error('connection dropped');
      }
      return original(batch);
    };
    const failed = await persistRecordingChunks(prepared, db.store, cryptoApi);
    expect(failed).toMatchObject({ status: 'incomplete', reason: 'write_failed_or_partial', verifiedChunks: 1 });
    const retried = await persistRecordingChunks(prepared, db.store, cryptoApi);
    expect(retried).toMatchObject({ status: 'complete', attemptedChunks: 3 });
    expect(db.saved).toHaveLength(4);
  });
  it('rejects a conflicting or duplicated chunk without touching the store', async () => {
    const prepared = await fixture();
    const altered = { ...prepared.rows[0], samples: prepared.rows[0].samples.map((p: any, i: number) =>
      i === 4 ? { ...p, heart_rate: 240 } : p) };
    const db = inMemory([altered]);
    expect((await persistRecordingChunks(prepared, db.store, cryptoApi)).status).toBe('blocked');
    expect(db.writes).toHaveLength(0);
    const dup = inMemory([prepared.rows[0], prepared.rows[0]]);
    expect((await persistRecordingChunks(prepared, dup.store, cryptoApi)).reason).toBe('unexpected_or_duplicate_chunk');
    expect(dup.writes).toHaveLength(0);
  });
  it('does not assume missing chunks from an incomplete paginated read', async () => {
    const prepared = await fixture();
    let writes = 0;
    const store = { listAll: async () => ({ complete: false, rows: [] as ChunkRow[] }),
      createBatch: async (_rows: ChunkRow[]) => { writes++; } };
    expect((await persistRecordingChunks(prepared, store, cryptoApi)).reason).toBe('unverified_initial_read');
    expect(writes).toBe(0);
  });
  it('rejects a successful API response that persisted no rows', async () => {
    const prepared = await fixture();
    const store = { listAll: async () => ({ complete: true, rows: [] as ChunkRow[] }),
      createBatch: async (_rows: ChunkRow[]) => ({ status: 200 }) };
    const result = await persistRecordingChunks(prepared, store, cryptoApi);
    expect(result).toMatchObject({ status: 'incomplete', verifiedChunks: 0 });
  });
  it('accepts complete, verified data after an ambiguous write exception', async () => {
    const prepared = await fixture();
    const db = inMemory();
    db.store.createBatch = async batch => { db.saved.push(...batch); throw Error('timeout after commit'); };
    const result = await persistRecordingChunks(prepared, db.store, cryptoApi);
    // 4 chunks in this fixture; all four persisted before the error.
    expect(result).toMatchObject({ status: 'complete', reason: 'verified_despite_ambiguous_write' });
  });
});
