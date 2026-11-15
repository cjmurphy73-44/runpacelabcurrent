import { MAX_STREAM_SAMPLES } from './streamValidity.ts';

// A file being uploaded, parsed, or referenced by WorkoutAsset is NOT evidence
// of a durable, fully reconstructable telemetry stream.
// This receipt describes only the WorkoutSession write intent and never says
// that the database write was read back or that original file retention is verified.
export function recordingPersistenceReceipt(
  sampleCount: number,
  attached: boolean,
  storedSessionSampleCount: number | null = null,
) {
  if (!Number.isInteger(sampleCount) || sampleCount < 0) {
    return { state: 'unverified', sample_count: null, session_sample_count: null, full_recording_verified: false };
  }
  if (attached) {
    return {
      state: 'attachment_unverified',
      sample_count: sampleCount,
      session_sample_count: null,
      full_recording_verified: false,
    };
  }
  if (sampleCount > MAX_STREAM_SAMPLES) {
    return {
      state: 'not_stored_on_session',
      sample_count: sampleCount,
      session_sample_count: 0,
      full_recording_verified: false,
    };
  }
  if (!Number.isInteger(storedSessionSampleCount) || storedSessionSampleCount !== sampleCount) {
    return {
      state: 'unverified',
      sample_count: sampleCount,
      session_sample_count: null,
      full_recording_verified: false,
    };
  }
  return {
    state: 'session_write_reported',
    sample_count: sampleCount,
    session_sample_count: storedSessionSampleCount,
    full_recording_verified: false,
  };
}
