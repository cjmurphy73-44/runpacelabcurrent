import { describe, expect, it } from 'vitest';
import { inlineRecordingOrUndefined, MAX_STREAM_SAMPLES } from '../../../base44/shared/streamValidity';

describe('COROS legacy inline recording persistence', () => {
  it('preserves an exact 3600-sample recording without dropping final sample', () => {
    const stream = Array.from({ length: MAX_STREAM_SAMPLES }, (_, time) => ({ time, heart_rate: 130, power: time % 2 ? 0 : 220 }));
    const stored = inlineRecordingOrUndefined(stream);
    expect(stored).toHaveLength(MAX_STREAM_SAMPLES);
    expect(stored?.at(-1)?.time).toBe(MAX_STREAM_SAMPLES - 1);
    expect(stored?.[1]?.power).toBe(0);
  });
  it('does not silently persist a prefix of a 5041-sample ride', () => {
    const stream = Array.from({ length: 5041 }, (_, time) => ({ time, heart_rate: 140 }));
    expect(inlineRecordingOrUndefined(stream)).toBeUndefined();
    expect(stream).toHaveLength(5041);
  });
  it('fails closed for empty, invalid and non-array input', () => {
    expect(inlineRecordingOrUndefined([])).toBeUndefined();
    expect(inlineRecordingOrUndefined(null)).toBeUndefined();
    expect(inlineRecordingOrUndefined({ length: 100 })).toBeUndefined();
  });
});
