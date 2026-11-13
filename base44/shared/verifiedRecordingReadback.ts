// Strict full-recording reconstruction from persistent chunks. Read-only.
// Deliberately not wired to any live backend or frontend route.
// Caller MUST authenticate and authorize athlete/session ownership and load
// the immutable manifest from trusted server-side storage (never request JSON).
// @ts-ignore Deno runtime requires the .ts extension.
import { verifyRecordingReadback, type RecordingManifest } from './recordingChunkManifest.ts';
// @ts-ignore Deno runtime requires the .ts extension.
import type { CompleteChunkRead } from './recordingChunkPersistence.ts';

export type VerifiedRecording =
  | { ok: true; samples: any[]; sample_count: number; start_time_s: number; end_time_s: number; source: 'verified_chunks' }
  | { ok: false; reason: string; samples: [] };

// Never hand partially verified telemetry to the physiology engine. A digest
// mismatch, missing page, wrong athlete/session, or excessive number of rows
// fails closed without exposing any samples.
export async function readVerifiedRecording(
  scope: { athlete_id: string; session_id: string },
  manifest: RecordingManifest,
  listAll: () => Promise<CompleteChunkRead>,
  cryptoApi?: Crypto,
): Promise<VerifiedRecording> {
  const failed = (reason: string): VerifiedRecording => ({ ok: false, reason, samples: [] });
  if (!scope?.athlete_id?.trim() || !scope?.session_id?.trim() ||
      !manifest || manifest.athlete_id !== scope.athlete_id ||
      manifest.session_id !== scope.session_id ||
      typeof listAll !== 'function') return failed('invalid_or_cross_scope_manifest');

  let response: CompleteChunkRead;
  try { response = await listAll(); }
  catch { return failed('chunk_read_failed'); }

  if (response?.complete !== true || !Array.isArray(response.rows)) {
    return failed('incomplete_chunk_read');
  }
  if (response.rows.length !== manifest.chunk_count) return failed('missing_or_duplicate_chunks');
  const verified = await verifyRecordingReadback(manifest, response.rows, cryptoApi);
  if (!verified) return failed('recording_integrity_failed');

  const rows = [...response.rows].sort((a, b) => a.chunk_index - b.chunk_index);
  const samples = rows.flatMap(row => row.samples);
  return {
    ok: true, samples, sample_count: samples.length,
    start_time_s: manifest.first_time_s, end_time_s: manifest.last_time_s,
    source: 'verified_chunks',
  };
}
