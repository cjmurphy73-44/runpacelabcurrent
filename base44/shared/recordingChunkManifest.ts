// Cryptographic readback contract for bounded workout telemetry chunks.
// Pure, no entity writes, OAuth, or access to athlete records.
// Persistence is COMPLETE only when every row and the full stream digest verify.
// SHA-256 covers exact persisted sample channels, not a mutable summary.
// @ts-ignore Deno import extensions are necessary at runtime.
import { validateRecordingChunks } from './recordingChunks.ts';

const SAMPLE_KEYS = ['time', 'heart_rate', 'altitude', 'distance', 'cadence', 'speed', 'power'];

function canonicalSamples(samples: any[]): any[][] {
  return samples.map((sample) => SAMPLE_KEYS.map((key) => {
    const value = sample[key];
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  }));
}

async function sha256(value: unknown, cryptoApi: Crypto = crypto): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const digest = await cryptoApi.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}

export interface RecordingManifest {
  athlete_id: string;
  session_id: string;
  chunk_count: number;
  sample_count: number;
  first_time_s: number;
  last_time_s: number;
  recording_sha256: string;
}

// Prepare all rows and a digest from a verified, fully planned recording.
// If chunk count or sample count exceeds the bounded planner, do not persist.
export async function prepareRecordingManifest(
  athleteId: string,
  sessionId: string,
  chunks: any[],
  cryptoApi?: Crypto,
): Promise<{ manifest: RecordingManifest; rows: any[] } | null> {
  if (!athleteId?.trim() || !sessionId?.trim() || !Array.isArray(chunks)) return null;
  const count = chunks.reduce((sum, c) => sum + (Array.isArray(c?.samples) ? c.samples.length : 0), 0);
  if (!validateRecordingChunks(chunks, count)) return null;
  const rows = [];
  for (const chunk of chunks) {
    rows.push({
      athlete_id: athleteId,
      session_id: sessionId,
      chunk_index: chunk.chunk_index,
      sample_count: chunk.sample_count,
      start_time_s: chunk.start_time_s,
      end_time_s: chunk.end_time_s,
      samples: chunk.samples,
      content_sha256: await sha256(canonicalSamples(chunk.samples), cryptoApi),
    });
  }
  const all = chunks.flatMap(c => c.samples);
  return {
    manifest: {
      athlete_id: athleteId,
      session_id: sessionId,
      chunk_count: rows.length,
      sample_count: count,
      first_time_s: all[0].time,
      last_time_s: all[all.length - 1].time,
      recording_sha256: await sha256(canonicalSamples(all), cryptoApi),
    },
    rows,
  };
}

// Verify readback before any consumer claims a full recording exists.
// A missing write, duplicate index, wrong athlete, changed sample, or wrong
// ordering must fail closed, including when a bulkCreate partially succeeds.
export async function verifyRecordingReadback(
  manifest: RecordingManifest,
  persistedRows: any[],
  cryptoApi?: Crypto,
): Promise<boolean> {
  if (!manifest || !Array.isArray(persistedRows) ||
    persistedRows.length !== manifest.chunk_count ||
    manifest.chunk_count < 1 || manifest.chunk_count > 96) return false;
  const rows = [...persistedRows].sort((a, b) => a.chunk_index - b.chunk_index);
  if (rows.some((row, i) =>
    row.athlete_id !== manifest.athlete_id ||
    row.session_id !== manifest.session_id ||
    row.chunk_index !== i ||
    !/^[0-9a-f]{64}$/.test(row.content_sha256 || '')
  )) return false;
  const count = rows.reduce((sum, row) =>
    sum + (Array.isArray(row.samples) ? row.samples.length : 0), 0);
  if (count !== manifest.sample_count || !validateRecordingChunks(rows, count)) return false;
  if (rows[0].start_time_s !== manifest.first_time_s ||
    rows[rows.length - 1].end_time_s !== manifest.last_time_s) return false;
  for (const row of rows) {
    if ((await sha256(canonicalSamples(row.samples), cryptoApi)) !== row.content_sha256) return false;
  }
  const all = rows.flatMap(row => row.samples);
  return (await sha256(canonicalSamples(all), cryptoApi)) === manifest.recording_sha256;
}
