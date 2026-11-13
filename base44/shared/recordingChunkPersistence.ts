// Pure transport-orchestrator for idempotent, fail-closed chunk persistence.
// NOT connected to ingestion. Caller must enforce athlete ownership using
// authoritative server identity and implement complete, bounded, paginated
// reads scoped to BOTH athlete_id and session_id using service-role access.
// No deletes, overwrites, or automatic retry of ambiguous writes.
// @ts-ignore Deno runtime requires explicit .ts extension.
import { verifyRecordingReadback, type RecordingManifest } from './recordingChunkManifest.ts';

export type ChunkRow = {
  athlete_id: string;
  session_id: string;
  chunk_index: number;
  sample_count: number;
  start_time_s: number;
  end_time_s: number;
  samples: any[];
  content_sha256: string;
};

// A "complete" query means ALL rows for this athlete+session, including
// duplicates. A single truncated page is NOT evidence that chunks are absent.
export type CompleteChunkRead = { rows: ChunkRow[]; complete: boolean };
export type ChunkStore = {
  listAll: () => Promise<CompleteChunkRead>;
  createBatch: (rows: ChunkRow[]) => Promise<unknown>;
};

export type ChunkPersistenceResult = {
  status: 'complete' | 'incomplete' | 'blocked';
  reason: string;
  attemptedChunks: number;
  verifiedChunks: number;
};

const SAMPLE_KEYS = ['time', 'heart_rate', 'altitude', 'distance', 'cadence', 'speed', 'power'] as const;
function sameSample(a: any, b: any): boolean {
  if (!a || !b) return false;
  return SAMPLE_KEYS.every(key => {
    const v1 = a[key], v2 = b[key];
    return (v1 == null ? null : v1) === (v2 == null ? null : v2);
  });
}

function exactChunk(a: ChunkRow, b: ChunkRow): boolean {
  return a.athlete_id === b.athlete_id &&
    a.session_id === b.session_id &&
    a.chunk_index === b.chunk_index &&
    a.sample_count === b.sample_count &&
    a.start_time_s === b.start_time_s &&
    a.end_time_s === b.end_time_s &&
    a.content_sha256 === b.content_sha256 &&
    Array.isArray(a.samples) && Array.isArray(b.samples) &&
    a.samples.length === b.samples.length &&
    a.samples.every((sample, i) => sameSample(sample, b.samples[i]));
}

function compareRows(manifest: RecordingManifest, expected: ChunkRow[], actual: ChunkRow[]): {
  ok: boolean;
  reason: string;
  missing: ChunkRow[];
  verified: number;
} {
  const byIndex = new Map<number, ChunkRow>();
  for (const row of actual) {
    if (!row || row.athlete_id !== manifest.athlete_id ||
      row.session_id !== manifest.session_id ||
      !Number.isInteger(row.chunk_index) ||
      row.chunk_index < 0 || row.chunk_index >= manifest.chunk_count ||
      byIndex.has(row.chunk_index)) {
      return { ok: false, reason: 'unexpected_or_duplicate_chunk', missing: [], verified: 0 };
    }
    byIndex.set(row.chunk_index, row);
  }
  const missing = [];
  for (const row of expected) {
    const saved = byIndex.get(row.chunk_index);
    if (!saved) missing.push(row);
    else if (!exactChunk(row, saved)) {
      return { ok: false, reason: 'conflicting_existing_chunk', missing: [], verified: 0 };
    }
  }
  return { ok: true, reason: 'ok', missing, verified: byIndex.size };
}

export async function persistRecordingChunks(
  prepared: { manifest: RecordingManifest; rows: ChunkRow[] },
  store: ChunkStore,
  cryptoApi?: Crypto,
): Promise<ChunkPersistenceResult> {
  const blocked = (reason: string, verified = 0, attempted = 0): ChunkPersistenceResult => ({
    status: 'blocked', reason, attemptedChunks: attempted, verifiedChunks: verified,
  });
  if (!prepared?.manifest || !Array.isArray(prepared.rows) ||
    prepared.rows.length < 1 || prepared.rows.length > 96 ||
    typeof store?.listAll !== 'function' || typeof store?.createBatch !== 'function') {
    return blocked('invalid_request');
  }
  const { manifest, rows } = prepared;
  // Treat the in-memory preparation like untrusted input: verify its digest.
  if (!(await verifyRecordingReadback(manifest, rows, cryptoApi))) {
    return blocked('invalid_manifest');
  }
  const safeList = async (): Promise<CompleteChunkRead | null> => {
    try {
      const result = await store.listAll();
      return result?.complete === true && Array.isArray(result.rows) ? result : null;
    } catch {
      return null;
    }
  };
  const firstRead = await safeList();
  if (!firstRead) return blocked('unverified_initial_read');
  const before = compareRows(manifest, rows, firstRead.rows);
  if (!before.ok) return blocked(before.reason);
  if (before.missing.length === 0) {
    return (await verifyRecordingReadback(manifest, firstRead.rows, cryptoApi))
      ? { status: 'complete', reason: 'verified_existing', attemptedChunks: 0, verifiedChunks: rows.length }
      : blocked('readback_digest_mismatch');
  }
  // Small, bounded requests to reduce partial-batch impact. A rejected
  // createBatch might still have written rows: do NOT retry inside this call.
  let attempted = 0;
  let failed = false;
  for (let i = 0; i < before.missing.length; i += 5) {
    const batch = before.missing.slice(i, i + 5);
    attempted += batch.length;
    try {
      await store.createBatch(batch);
    } catch {
      failed = true;
      break;
    }
  }

  // A successful write response is never proof of persistence.
  const finalRead = await safeList();
  if (!finalRead) return {
    status: 'incomplete',
    reason: 'unverified_final_read',
    attemptedChunks: attempted,
    verifiedChunks: before.verified,
  };
  const after = compareRows(manifest, rows, finalRead.rows);
  if (!after.ok) return blocked(after.reason, 0, attempted);
  if (after.missing.length > 0) {
    return {
      status: 'incomplete',
      reason: failed ? 'write_failed_or_partial' : 'partial_or_unconfirmed_write',
      attemptedChunks: attempted,
      verifiedChunks: after.verified,
    };
  }
  if (!(await verifyRecordingReadback(manifest, finalRead.rows, cryptoApi))) {
    return blocked('readback_digest_mismatch', after.verified, attempted);
  }
  return {
    status: 'complete',
    reason: failed ? 'verified_despite_ambiguous_write' : 'verified_readback',
    attemptedChunks: attempted,
    verifiedChunks: rows.length,
  };
}
