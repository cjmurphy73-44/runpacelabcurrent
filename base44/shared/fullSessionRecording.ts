// Server-side, fail-closed bridge from immutable chunk readback to full-session
// physiology. This is a pure gateway, NOT a live endpoint. Caller must obtain
// athlete/session scope and duration from authorized server records.
// @ts-ignore Deno runtime requires explicit .ts extension.
import { readVerifiedRecording, type VerifiedRecording } from './verifiedRecordingReadback.ts';
// @ts-ignore Deno runtime requires explicit .ts extension.
import type { RecordingManifest } from './recordingChunkManifest.ts';
// @ts-ignore Deno runtime requires explicit .ts extension.
import type { CompleteChunkRead } from './recordingChunkPersistence.ts';

export type FullSessionRecording =
  | { ok: true; source: 'verified_chunks'; samples: any[]; sample_count: number; duration_coverage: 'complete' }
  | { ok: false; reason: string; samples: []; duration_coverage: 'unverified' };

/**
 * A verified digest alone proves the stored chunks are internally intact,
 * not that they span the workout. Enforce duration coverage before releasing
 * samples to whole-session zone or load computation.
 */
export async function readFullSessionRecording(
  scope: { athlete_id: string; session_id: string },
  durationSeconds: number,
  manifest: RecordingManifest,
  listAll: () => Promise<CompleteChunkRead>,
  cryptoApi?: Crypto,
): Promise<FullSessionRecording> {
  const failed = (reason: string): FullSessionRecording =>
    ({ ok: false, reason, samples: [], duration_coverage: 'unverified' });
  if (!Number.isFinite(durationSeconds) || durationSeconds < 60 || durationSeconds > 7 * 86400) {
    return failed('invalid_session_duration');
  }
  const result: VerifiedRecording = await readVerifiedRecording(scope, manifest, listAll, cryptoApi);
  if (!result.ok) return failed(result.reason);
  const start = result.start_time_s;
  const end = result.end_time_s;
  const span = end - start;
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 ||
      start > Math.max(5, durationSeconds * 0.02) ||
      span < durationSeconds * 0.95 ||
      span > durationSeconds * 1.05 + 5) {
    return failed('incomplete_session_duration_coverage');
  }
  return {
    ok: true, source: 'verified_chunks', samples: result.samples,
    sample_count: result.sample_count, duration_coverage: 'complete',
  };
}
