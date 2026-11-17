import { describe, expect, it } from 'vitest';
import { recordingTruncationNotice } from '../../../base44/shared/recordingTruncationNotice.ts';

describe('COROS original FIT truncation acknowledgement', () => {
  it('does not warn for a complete recording at the storage limit', () => {
    expect(recordingTruncationNotice(Array.from({ length: 3600 }, (_, time) => ({ time })))).toBeNull();
  });
  it('discloses original sample count and original timespan without claiming archived bytes', () => {
    const samples = Array.from({ length: 14400 }, (_, time) => ({ time }));
    const message = recordingTruncationNotice(samples);
    expect(message).toContain('14400 samples');
    expect(message).toContain('0s–14399s');
    expect(message).toContain('first 3600 samples');
    expect(message).toContain('Full-recording display is not available');
    expect(message).not.toMatch(/archived|successfully saved/);
  });
  it('does not invent a time range for malformed input', () => {
    expect(recordingTruncationNotice([{ time: null }, { time: undefined }], 1)).toContain('time span unavailable');
  });
  it('rejects unsupported storage bounds without creating a false warning', () => {
    expect(recordingTruncationNotice([{ time: 0 }, { time: 1 }], 0)).toBeNull();
    expect(recordingTruncationNotice(null)).toBeNull();
  });
});
