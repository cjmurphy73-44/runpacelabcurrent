// Pure, bounded full-duration telemetry preparation. This module does not
// persist chunks or mutate WorkoutSession; callers must complete auth, storage
// integrity, idempotency and transactional/partial-write checks before release.
import { storageStream } from './streamValidity.ts';

export const RECORDING_CHUNK_SAMPLES = 300;
export const MAX_RECORDING_CHUNKS = 96; // 8h @ 1Hz, bounded entity writes.

// Do not downsample, invent interpolated values, or silently truncate a ride.
// Every sample (including zero-watt coasting) must have an exact destination.
export function planRecordingChunks(
  samples: any[],
  options: { chunkSize?: number; maxChunks?: number } = {},
): { ok: true; chunks: Array<{ chunk_index: number; sample_count: number; start_time_s: number; end_time_s: number; samples: any[] }> }
  | { ok: false; reason: string; chunks: [] } {
  const chunkSize = options.chunkSize ?? RECORDING_CHUNK_SAMPLES;
  const maxChunks = options.maxChunks ?? MAX_RECORDING_CHUNKS;
  if (!Number.isInteger(chunkSize) || chunkSize < 1 || chunkSize > 300 ||
    !Number.isInteger(maxChunks) || maxChunks < 1 || maxChunks > 96) {
    return { ok: false, reason: 'invalid_chunk_budget', chunks: [] };
  }
  if (!Array.isArray(samples) || samples.length < 2) {
    return { ok: false, reason: 'missing_stream', chunks: [] };
  }
  if (samples.length > chunkSize * maxChunks) {
    return { ok: false, reason: 'exceeds_chunk_budget', chunks: [] };
  }
  let previous = -Infinity;
  for (const p of samples) {
    const t = p?.time;
    if (typeof t !== 'number' || !Number.isFinite(t) || t < 0 || t <= previous) {
      return { ok: false, reason: 'invalid_timestamps', chunks: [] };
    }
    previous = t;
  }

  const chunks = [];
  for (let index = 0; index < Math.ceil(samples.length / chunkSize); index++) {
    const begin = index * chunkSize;
    const part = storageStream(samples.slice(begin, begin + chunkSize));
    chunks.push({
      chunk_index: index,
      sample_count: part.length,
      start_time_s: part[0].time,
      end_time_s: part[part.length - 1].time,
      samples: part,
    });
  }
  return { ok: true, chunks };
}

export function validateRecordingChunks(
  chunks: any[],
  expectedSampleCount: number,
): boolean {
  if (!Array.isArray(chunks) || !Number.isInteger(expectedSampleCount) ||
    expectedSampleCount < 2 || chunks.length < 1 || chunks.length > MAX_RECORDING_CHUNKS) return false;
  let previous = -Infinity;
  let count = 0;
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const samples = chunk?.samples;
    if (chunk?.chunk_index !== i || !Array.isArray(samples) ||
      samples.length < 1 || samples.length > RECORDING_CHUNK_SAMPLES ||
      chunk.sample_count !== samples.length) return false;
    if (chunk.start_time_s !== samples[0].time ||
      chunk.end_time_s !== samples[samples.length - 1].time) return false;
    for (const p of samples) {
      if (typeof p?.time !== 'number' || !Number.isFinite(p.time) ||
        p.time <= previous) return false;
      previous = p.time;
      count++;
    }
  }
  return count === expectedSampleCount;
}
