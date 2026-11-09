// Application resource budgets, NOT claims about Base44's hosted maximums.
// Validate the deployed platform contract before promoting this policy.
export const MAX_FIT_INPUT_BYTES = 8 * 1024 * 1024;
export const MAX_INLINE_WORKOUT_BYTES = 1024 * 1024;

export class RecordingStorageError extends Error {
  constructor(public code: string, message: string, public status: number, public retryable = false) {
    super(message);
  }
}

export async function readBoundedRecording(response: Response): Promise<Uint8Array> {
  if (!response.ok) throw new RecordingStorageError('recording_download_failed', 'The original recording could not be downloaded. No workout was saved.', 502, true);
  const declared = Number(response.headers.get('content-length'));
  if (declared > MAX_FIT_INPUT_BYTES) {
    await response.body?.cancel().catch(() => {});
    throw new RecordingStorageError('recording_input_too_large', 'Recording exceeds the input size limit. No workout was saved.', 413);
  }
  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_FIT_INPUT_BYTES) {
        await reader.cancel().catch(() => {});
        throw new RecordingStorageError('recording_input_too_large', 'Recording exceeds the input size limit. No workout was saved.', 413);
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}

export function assertInlineWorkoutFits(payload: unknown): number {
  const size = new TextEncoder().encode(JSON.stringify(payload)).byteLength;
  if (size > MAX_INLINE_WORKOUT_BYTES) {
    throw new RecordingStorageError('recording_storage_limit', 'Detailed recording exceeds the inline storage limit. No workout was saved.', 413);
  }
  return size;
}

export async function recordingProvenance(bytes: Uint8Array, stream: any[], laps: any[], source: 'garmin_fit' | 'coros_fit' = 'garmin_fit') {
  const hash = await crypto.subtle.digest('SHA-256', Uint8Array.from(bytes));
  return {
    source, retention: 'complete_decoded_inline_v1',
    source_sha256: Array.from(new Uint8Array(hash), value => value.toString(16).padStart(2, '0')).join(''),
    source_bytes: bytes.byteLength, original_file_retained: false,
    decoded_samples: stream.length, stored_samples: stream.length,
    decoded_laps: laps.length, stored_laps: laps.length,
    first_time_s: stream[0]?.time, last_time_s: stream.at(-1)?.time,
    channels: ['heart_rate', 'altitude', 'distance', 'cadence', 'speed', 'power']
      .filter(channel => stream.some(point => typeof point[channel] === 'number' && Number.isFinite(point[channel]))),
    inline_limit_bytes: MAX_INLINE_WORKOUT_BYTES,
  };
}

export function recordingErrorResponse(error: unknown): Response {
  const known = error instanceof RecordingStorageError;
  return Response.json({
    error: known ? error.message : 'The original recording could not be processed. No workout was saved.',
    code: known ? error.code : 'recording_download_failed', retryable: known ? error.retryable : true,
  }, { status: known ? error.status : 502 });
}
