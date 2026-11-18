import { describe, expect, it } from 'vitest';
import { webcrypto } from 'node:crypto';
import { planRecordingChunks } from '../../../base44/shared/recordingChunks';
import { prepareRecordingManifest, verifyRecordingReadback } from '../../../base44/shared/recordingChunkManifest';
import { commitFullRecording, type DurableRecordingManifest, type ExclusiveRecordingLease } from '../../../base44/shared/recordingSessionCommit';
import type { ChunkRow } from '../../../base44/shared/recordingChunkPersistence';

// Pure, network-denied synthetic persistence contract. No Base44 entity calls.
const cryptoApi = webcrypto as unknown as Crypto;
async function fixture(count: number) {
  const stream = Array.from({ length: count }, (_, time) => ({
    time, heart_rate: 120 + time % 30, power: time % 11 === 0 ? 0 : 200,
  }));
  const planned = planRecordingChunks(stream);
  if (!planned.ok) throw new Error('Synthetic recording rejected');
  const prepared = await prepareRecordingManifest('owner-synthetic', 'session-synthetic', planned.chunks, cryptoApi);
  if (!prepared) throw new Error('Synthetic manifest rejected');
  return prepared;
}
function memoryStore() {
  const chunks: ChunkRow[] = [];
  const manifests: DurableRecordingManifest[] = [];
  let writes = 0;
  const chunkStore = {
    listAll: async () => ({ complete: true, rows: chunks.map(row => structuredClone(row)) }),
    createBatch: async (rows: ChunkRow[]) => { writes++; chunks.push(...rows.map(row => structuredClone(row))); },
  };
  const manifestStore = {
    listAll: async () => ({ complete: true, rows: manifests.map(row => structuredClone(row)) }),
    create: async (row: DurableRecordingManifest) => { manifests.push(structuredClone(row)); },
  };
  const lease: ExclusiveRecordingLease = { runExclusive: async (_scope, work) => work() };
  return { chunks, manifests, chunkStore, manifestStore, lease, getWrites: () => writes };
}

describe('ING-010 full-recording commit capacity acceptance (source only)', () => {
  for (const count of [3600, 3601, 7201]) {
    it(`verifies all ${count} original samples after commit, without a 3600-sample cutoff`, async () => {
      const prepared = await fixture(count);
      const db = memoryStore();
      const result = await commitFullRecording(prepared, db.chunkStore, db.manifestStore, db.lease, cryptoApi);
      expect(result).toEqual({ state: 'complete', reason: 'verified_durable_commit' });
      expect(db.manifests).toHaveLength(1);
      expect(db.manifests[0]).toMatchObject({
        athlete_id: 'owner-synthetic', session_id: 'session-synthetic',
        sample_count: count, first_time_s: 0, last_time_s: count - 1,
        chunk_count: prepared.rows.length, state: 'complete', version: 1,
      });
      expect(db.chunks.reduce((total, row) => total + row.sample_count, 0)).toBe(count);
      expect(db.chunks.at(-1)?.samples.at(-1)?.time).toBe(count - 1);
      expect(await verifyRecordingReadback(prepared.manifest, db.chunks, cryptoApi)).toBe(true);
      const writes = db.getWrites();
      expect(await commitFullRecording(prepared, db.chunkStore, db.manifestStore, db.lease, cryptoApi))
        .toEqual({ state: 'complete', reason: 'verified_existing_manifest' });
      expect(db.getWrites()).toBe(writes);
      expect(db.manifests).toHaveLength(1);
    });
  }

  it('does not certify a full recording when a persisted interior chunk is corrupted', async () => {
    const prepared = await fixture(7201);
    const db = memoryStore();
    expect((await commitFullRecording(prepared, db.chunkStore, db.manifestStore, db.lease, cryptoApi)).state).toBe('complete');
    const middle = Math.floor(db.chunks.length / 2);
    db.chunks[middle].samples[1].heart_rate = 999;
    expect(await verifyRecordingReadback(prepared.manifest, db.chunks, cryptoApi)).toBe(false);
    expect(await commitFullRecording(prepared, db.chunkStore, db.manifestStore, db.lease, cryptoApi))
      .toEqual({ state: 'blocked', reason: 'manifest_without_verified_chunks' });
  });

  it('does not create chunks or a manifest when exclusive lease acquisition fails', async () => {
    const prepared = await fixture(7201);
    const db = memoryStore();
    const unavailable: ExclusiveRecordingLease = {
      runExclusive: async () => { throw new Error('synthetic lease unavailable'); },
    };
    expect(await commitFullRecording(prepared, db.chunkStore, db.manifestStore, unavailable, cryptoApi))
      .toEqual({ state: 'incomplete', reason: 'exclusive_lock_or_commit_failed' });
    expect(db.chunks).toHaveLength(0);
    expect(db.manifests).toHaveLength(0);
  });
});
