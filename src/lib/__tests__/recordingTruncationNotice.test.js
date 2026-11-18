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
  it('does not misidentify non-FIT TCX or CSV backfills as original FIT files', () => {
    const samples = Array.from({ length: 3601 }, (_, time) => ({ time }));
    const notice = recordingTruncationNotice(samples);
    expect(notice).toContain('Source recording has 3601 samples');
    expect(notice).toContain('computed metrics may use the full source recording');
    expect(notice).not.toMatch(/Original FIT|original FIT|archived|successfully saved/);
  });
  it('does not invent a time range for malformed input', () => {
    expect(recordingTruncationNotice([{ time: null }, { time: undefined }], 1)).toContain('time span unavailable');
  });
  it('does not claim complete recording coverage from plausible endpoints with corrupt interior times', () => {
    const valid = Array.from({ length: 3601 }, (_, time) => ({ time }));
    for (const corrupt of [null, -2, Infinity, 1.5, 9999]) {
      const samples = valid.map((sample) => ({ ...sample }));
      samples[1800].time = corrupt;
      const notice = recordingTruncationNotice(samples);
      expect(notice).toContain('3601 samples');
      expect(notice).toContain('recording time span unavailable');
      expect(notice).not.toContain('recorded time 0s–3600s');
    }
    expect(recordingTruncationNotice(valid)).toContain('recorded time 0s–3600s');
  });
  it('rejects unsupported storage bounds without creating a false warning', () => {
    expect(recordingTruncationNotice([{ time: 0 }, { time: 1 }], 0)).toBeNull();
    expect(recordingTruncationNotice(null)).toBeNull();
  });
});
