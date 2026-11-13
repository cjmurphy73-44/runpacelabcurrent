// Release-gated recording commit protocol. SOURCE ONLY, NO DEPLOYED CALLERS.
// A trusted server MUST provide a distributed per-athlete+session exclusive lock
// with fencing/expiry protection, plus scoped exhaustive manifest queries.
// Neither a JS process mutex nor a read-then-create API is a distributed lock.
// @ts-ignore Deno runtime requires explicit .ts extension.
import { persistRecordingChunks, type ChunkStore } from './recordingChunkPersistence.ts';
// @ts-ignore Deno runtime requires explicit .ts extension.
import { verifyRecordingReadback, type RecordingManifest } from './recordingChunkManifest.ts';

export type DurableRecordingManifest = RecordingManifest & {
  state: 'complete';
  version: 1;
};

export type ManifestStore = {
  // Returns ALL manifest rows for this exact athlete AND session (incl duplicates).
  listAll: () => Promise<{ complete: boolean; rows: DurableRecordingManifest[] }>;
  // No upsert/overwrite; an ambiguous create MUST be reconciled via listAll.
  create: (manifest: DurableRecordingManifest) => Promise<unknown>;
};
export type ExclusiveRecordingLease = {
  // Must be backed by a durable database uniqueness/conditional-write protocol,
  // not an in-process mutex; release must be owned by lease token.
  runExclusive: <T>(scope: { athlete_id: string; session_id: string }, work: () => Promise<T>) => Promise<T>;
};

export type RecordingCommitResult = {
  state: 'complete' | 'incomplete' | 'blocked';
  reason: string;
};

function sameManifest(a: RecordingManifest, b: RecordingManifest): boolean {
  return a.athlete_id === b.athlete_id &&
    a.session_id === b.session_id &&
    a.chunk_count === b.chunk_count &&
    a.sample_count === b.sample_count &&
    a.first_time_s === b.first_time_s &&
    a.last_time_s === b.last_time_s &&
    a.recording_sha256 === b.recording_sha256;
}

export async function commitFullRecording(
  prepared: { manifest: RecordingManifest; rows: any[] },
  chunkStore: ChunkStore,
  manifestStore: ManifestStore,
  lease: ExclusiveRecordingLease,
  cryptoApi?: Crypto,
): Promise<RecordingCommitResult> {
  const blocked = (reason: string): RecordingCommitResult => ({ state: 'blocked', reason });
  if (!prepared?.manifest || !Array.isArray(prepared.rows) ||
    !chunkStore || typeof chunkStore.listAll !== 'function' ||
    typeof chunkStore.createBatch !== 'function' ||
    !manifestStore || typeof manifestStore.listAll !== 'function' ||
    typeof manifestStore.create !== 'function' ||
    typeof lease?.runExclusive !== 'function' ||
    !prepared.manifest.athlete_id?.trim() || !prepared.manifest.session_id?.trim()) {
    return blocked('missing_server_storage_or_lock');
  }
  const { manifest, rows } = prepared;
  // No data may be written unless the complete original manifest is valid.
  if (!(await verifyRecordingReadback(manifest, rows, cryptoApi))) return blocked('invalid_prepared_recording');

  const scope = { athlete_id: manifest.athlete_id, session_id: manifest.session_id };
  try {
    return await lease.runExclusive(scope, async () => {
      // The lock must cover both chunk creation and manifest creation, including
      // all readback checks. A stale lock is NOT permitted to commit a manifest.
      const listManifests = async () => {
        try {
          const response = await manifestStore.listAll();
          return response?.complete === true && Array.isArray(response.rows) &&
            response.rows.length <= 1 ? response.rows : null;
        } catch { return null; }
      };
      const existing = await listManifests();
      if (existing === null) return blocked('unverified_or_duplicate_manifest');
      if (existing.length === 1) {
        if (existing[0].state !== 'complete' || existing[0].version !== 1 ||
          !sameManifest(existing[0], manifest)) return blocked('conflicting_manifest');
        const read = await chunkStore.listAll().catch(() => null);
        if (!read?.complete || !(await verifyRecordingReadback(manifest, read.rows, cryptoApi))) {
          return blocked('manifest_without_verified_chunks');
        }
        return { state: 'complete', reason: 'verified_existing_manifest' };
      }

      const saved = await persistRecordingChunks(prepared, chunkStore, cryptoApi);
      if (saved.status !== 'complete') {
        return { state: saved.status === 'blocked' ? 'blocked' : 'incomplete', reason: saved.reason };
      }

      const durable: DurableRecordingManifest = { ...manifest, version: 1, state: 'complete' };
      try { await manifestStore.create(durable); }
      catch { /* May have committed; only an exhaustive readback is authoritative. */ }

      const final = await listManifests();
      if (final === null) return { state: 'incomplete', reason: 'unverified_manifest_write' };
      if (final.length !== 1 || final[0].state !== 'complete' ||
        final[0].version !== 1 || !sameManifest(final[0], manifest)) {
        return { state: 'incomplete', reason: 'manifest_not_confirmed' };
      }
      const chunkRead = await chunkStore.listAll().catch(() => null);
      if (!chunkRead?.complete || !(await verifyRecordingReadback(manifest, chunkRead.rows, cryptoApi))) {
        return blocked('manifest_without_verified_chunks');
      }
      return { state: 'complete', reason: 'verified_durable_commit' };
    });
  } catch {
    // A lease failure is not evidence that any incomplete write was rolled back.
    // Never automatically retry from inside the same request.
    return { state: 'incomplete', reason: 'exclusive_lock_or_commit_failed' };
  }
}
