import { describe, expect, it } from 'vitest';
import { webcrypto } from 'node:crypto';
import { planRecordingChunks } from '../../../base44/shared/recordingChunks';
import { prepareRecordingManifest } from '../../../base44/shared/recordingChunkManifest';
import { commitFullRecording, type DurableRecordingManifest, type ExclusiveRecordingLease } from '../../../base44/shared/recordingSessionCommit';
import type { ChunkRow } from '../../../base44/shared/recordingChunkPersistence';

const cryptoApi = webcrypto as unknown as Crypto;
async function fixture(count = 601) {
  const stream = Array.from({ length: count }, (_, time) => ({
    time, heart_rate: 135 + time % 23, power: time % 17 === 0 ? 0 : 210,
  }));
  const chunks = planRecordingChunks(stream);
  if (!chunks.ok) throw Error('Invalid synthetic fixture');
  const prepared = await prepareRecordingManifest('synthetic-owner', 'synthetic-session', chunks.chunks, cryptoApi);
  if (!prepared) throw Error('Invalid synthetic manifest');
  return prepared;
}
function fakeStorage() {
  const chunks: ChunkRow[] = [];
  const manifests: DurableRecordingManifest[] = [];
  let chunkWrites = 0;
  let manifestWrites = 0;
  const store = {
    listAll: async () => ({ complete: true, rows: [...chunks] }),
    createBatch: async (rows: ChunkRow[]) => { chunkWrites++; chunks.push(...rows); },
  };
  const manifestStore = {
    listAll: async () => ({ complete: true, rows: [...manifests] }),
    create: async (manifest: DurableRecordingManifest) => { manifestWrites++; manifests.push(manifest); },
  };
  const lease: ExclusiveRecordingLease = {
    runExclusive: async (_scope, work) => work(),
  };
  return {
    chunks, manifests, store, manifestStore, lease,
    metrics: () => ({ chunkWrites, manifestWrites }),
  };
}
describe('staged recording commit, no live entity calls', () => {
  it('commits 5041 recorded samples once, only after verified readback', async () => {
    const prepared = await fixture(5041);
    const db = fakeStorage();
    const result = await commitFullRecording(prepared, db.store, db.manifestStore, db.lease, cryptoApi);
    expect(result).toEqual({ state: 'complete', reason: 'verified_durable_commit' });
    expect(db.chunks).toHaveLength(17);
    expect(db.manifests).toHaveLength(1);
    expect(db.manifests[0]).toMatchObject({ state: 'complete', version: 1, sample_count: 5041 });
    const second = await commitFullRecording(prepared, db.store, db.manifestStore, db.lease, cryptoApi);
    expect(second).toEqual({ state: 'complete', reason: 'verified_existing_manifest' });
    expect(db.metrics()).toEqual({ chunkWrites: 4, manifestWrites: 1 });
  });
  it('does not publish a manifest after a partial chunk write', async () => {
    const prepared = await fixture();
    const db = fakeStorage();
    db.store.createBatch = async rows => { db.chunks.push(rows[0]); };
    const result = await commitFullRecording(prepared, db.store, db.manifestStore, db.lease, cryptoApi);
    expect(result.state).toBe('incomplete');
    expect(db.manifests).toHaveLength(0);
  });
  it('does not trust an ambiguous manifest write unless readback confirms it', async () => {
    const prepared = await fixture();
    const db = fakeStorage();
    db.manifestStore.create = async (m: DurableRecordingManifest) => {
      db.manifests.push(m);
      throw Error('connection dropped after commit');
    };
    const result = await commitFullRecording(prepared, db.store, db.manifestStore, db.lease, cryptoApi);
    expect(result.state).toBe('complete');
    const uncertain = fakeStorage();
    uncertain.manifestStore.create = async () => { throw Error('no commit'); };
    expect((await commitFullRecording(prepared, uncertain.store, uncertain.manifestStore, uncertain.lease, cryptoApi)).state).toBe('incomplete');
  });
  it('rejects duplicate or conflicting manifests with no new writes', async () => {
    const prepared = await fixture();
    const db = fakeStorage();
    const original: DurableRecordingManifest = { ...prepared.manifest, state: 'complete', version: 1 };
    db.manifests.push(original, original);
    expect((await commitFullRecording(prepared, db.store, db.manifestStore, db.lease, cryptoApi)).reason).toBe('unverified_or_duplicate_manifest');
    expect(db.metrics()).toEqual({ chunkWrites: 0, manifestWrites: 0 });
    db.manifests.pop();
    db.manifests[0] = { ...original, recording_sha256: 'b'.repeat(64) };
    expect((await commitFullRecording(prepared, db.store, db.manifestStore, db.lease, cryptoApi)).reason).toBe('conflicting_manifest');
  });
  it('rejects invalid original recordings before acquiring the lock', async () => {
    const prepared = await fixture();
    const db = fakeStorage();
    let lockCalls = 0;
    const lease: ExclusiveRecordingLease = {
      runExclusive: async (_scope, work) => { lockCalls++; return work(); },
    };
    prepared.rows[0].samples[0].power = 999;
    expect((await commitFullRecording(prepared, db.store, db.manifestStore, lease, cryptoApi)).reason).toBe('invalid_prepared_recording');
    expect(lockCalls).toBe(0);
  });
  it('refuses a lock backend error and does not claim a complete recording', async () => {
    const prepared = await fixture();
    const db = fakeStorage();
    const lease: ExclusiveRecordingLease = { runExclusive: async () => { throw Error('lock unavailable'); } };
    expect(await commitFullRecording(prepared, db.store, db.manifestStore, lease, cryptoApi))
      .toEqual({ state: 'incomplete', reason: 'exclusive_lock_or_commit_failed' });
    expect(db.manifests).toHaveLength(0);
  });
  it('refuses a completed manifest if its saved chunk data no longer verifies', async () => {
    const prepared = await fixture();
    const db = fakeStorage();
    await commitFullRecording(prepared, db.store, db.manifestStore, db.lease, cryptoApi);
    db.chunks[0].samples[1] = { ...db.chunks[0].samples[1], heart_rate: 210 };
    const again = await commitFullRecording(prepared, db.store, db.manifestStore, db.lease, cryptoApi);
    expect(again).toEqual({ state: 'blocked', reason: 'manifest_without_verified_chunks' });
  });
});
