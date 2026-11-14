// Release-gated full-recording ingestion coordinator. Not a deployed endpoint.
// Caller MUST authenticate athlete/session ownership and supply a real atomic,
// storage-fenced distributed lease. No legacy inline truncation fallback.
// @ts-ignore Deno runtime import extension
import { planRecordingChunks } from './recordingChunks.ts';
// @ts-ignore Deno runtime import extension
import { prepareRecordingManifest } from './recordingChunkManifest.ts';
// @ts-ignore Deno runtime import extension
import { commitFullRecording, type ManifestStore, type ExclusiveRecordingLease } from './recordingSessionCommit.ts';
// @ts-ignore Deno runtime import extension
import type { ChunkStore } from './recordingChunkPersistence.ts';
// @ts-ignore Deno runtime import extension
import { readFullSessionRecording } from './fullSessionRecording.ts';

export type IngestFullRecordingResult =
  | { status: 'complete'; sample_count: number; source: 'verified_chunks' }
  | { status: 'blocked' | 'incomplete'; reason: string; sample_count: 0 };

export async function ingestFullRecording(
  input: { athlete_id: string; session_id: string; duration_seconds: number; samples: any[] },
  dependencies: { chunkStore: ChunkStore; manifestStore: ManifestStore; lease: ExclusiveRecordingLease },
  cryptoApi?: Crypto,
): Promise<IngestFullRecordingResult> {
  const failed = (status: 'blocked' | 'incomplete', reason: string): IngestFullRecordingResult =>
    ({ status, reason, sample_count: 0 });
  if (!input?.athlete_id?.trim() || !input?.session_id?.trim() ||
      !Number.isFinite(input.duration_seconds) || input.duration_seconds < 60 ||
      !Array.isArray(input.samples) || !dependencies?.lease ||
      !dependencies?.chunkStore || !dependencies?.manifestStore) {
    return failed('blocked', 'invalid_ingest_request');
  }
  const plan = planRecordingChunks(input.samples);
  if (!plan.ok) return failed('blocked', plan.reason);
  const prepared = await prepareRecordingManifest(
    input.athlete_id, input.session_id, plan.chunks, cryptoApi);
  if (!prepared) return failed('blocked', 'invalid_recording_manifest');
  // Reject a valid but short prefix BEFORE writing any chunks.
  const start = prepared.manifest.first_time_s;
  const span = prepared.manifest.last_time_s - start;
  if (start > Math.max(5, input.duration_seconds * 0.02) ||
      span < input.duration_seconds * 0.95 ||
      span > input.duration_seconds * 1.05 + 5) {
    return failed('blocked', 'incomplete_duration_coverage');
  }
  const committed = await commitFullRecording(
    prepared, dependencies.chunkStore, dependencies.manifestStore, dependencies.lease, cryptoApi);
  if (committed.state !== 'complete') return failed(committed.state, committed.reason);
  // Even a successful commit is not permission to expose telemetry without
  // independently verified durable readback and session duration.
  const verified = await readFullSessionRecording(
    { athlete_id: input.athlete_id, session_id: input.session_id },
    input.duration_seconds, prepared.manifest, dependencies.chunkStore.listAll, cryptoApi);
  if (!verified.ok) return failed('incomplete', verified.reason);
  return { status: 'complete', sample_count: verified.sample_count, source: 'verified_chunks' };
}
