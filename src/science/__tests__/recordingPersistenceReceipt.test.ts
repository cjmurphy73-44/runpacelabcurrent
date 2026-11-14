import { describe, expect, it } from 'vitest';
import { recordingPersistenceReceipt } from '../../../base44/shared/recordingPersistenceReceipt';

describe('recording import persistence receipt', () => {
  it('discloses a long 84-minute 1Hz recording not stored on WorkoutSession', () => {
    expect(recordingPersistenceReceipt(5041, false)).toEqual({
      state: 'not_stored_on_session', sample_count: 5041,
      session_sample_count: 0, full_recording_verified: false,
    });
  });
  it('does not claim durable readback from a successful short-session write', () => {
    expect(recordingPersistenceReceipt(90, false, 90)).toMatchObject({
      state: 'session_write_reported', sample_count: 90,
      session_sample_count: 90, full_recording_verified: false,
    });
  });
  it('fails closed if a short-session write omitted samples', () => {
    expect(recordingPersistenceReceipt(90, false, null)).toMatchObject({
      state: 'unverified', full_recording_verified: false,
    });
  });
  it('does not equate an attachment or reconciliation with verified retention', () => {
    expect(recordingPersistenceReceipt(5041, true)).toMatchObject({
      state: 'attachment_unverified', full_recording_verified: false,
    });
  });
  it('rejects invalid counts rather than asserting completeness', () => {
    expect(recordingPersistenceReceipt(NaN, false).state).toBe('unverified');
    expect(recordingPersistenceReceipt(-1, false).full_recording_verified).toBe(false);
  });
});
