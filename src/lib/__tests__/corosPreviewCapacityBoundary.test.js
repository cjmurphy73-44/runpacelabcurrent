import { describe, expect, it } from 'vitest';
import { boundedRecordingPreview } from '../../../base44/shared/recordingPreview.ts';

// Synthetic FIT-decoded samples only: this test does not attest original FIT storage.
const stream = (length) => Array.from({ length }, (_, time) => ({
  time,
  heart_rate: 110 + (time % 60),
  power: 150 + (time % 100),
}));

describe('COR-010 preview capacity boundary acceptance', () => {
  for (const length of [3600, 3601, 7201]) {
    it(`distinguishes original ${length}-sample source from its bounded preview`, () => {
      const original = stream(length);
      const result = boundedRecordingPreview(original);
      const expectedCount = Math.min(length, 3600);
      expect(result.samples).toHaveLength(expectedCount);
      expect(result.provenance).toEqual({
        original_samples: length,
        stored_samples: expectedCount,
        complete: length <= 3600,
        first_time: 0,
        last_time: length - 1,
      });
      expect(result.samples[0]).toEqual(original[0]);
      expect(result.samples.at(-1)).toEqual(original.at(-1));
      expect(result.samples.every((sample, index) =>
        index === 0 || sample.time > result.samples[index - 1].time)).toBe(true);
      // A preview must not mutate source samples used for deterministic calculations.
      result.samples[0].power = -999;
      expect(original[0].power).toBe(150);
      if (length > 3600) {
        expect(result.samples[1].time).toBeGreaterThan(0);
        expect(result.provenance.complete).toBe(false);
      }
    });
  }

  it('fails closed on untrustworthy interior timestamps even with plausible endpoints', () => {
    const original = stream(3601);
    for (const invalid of [-1, NaN, Infinity, null, 1800, 1802]) {
      const modified = original.slice();
      modified[1801] = { ...modified[1801], time: invalid };
      expect(() => boundedRecordingPreview(modified)).toThrow(TypeError);
    }
  });

  it('does not represent preview sampling as lossless original recording persistence', () => {
    const result = boundedRecordingPreview(stream(7201));
    expect(result.samples.length).toBeLessThan(result.provenance.original_samples);
    expect(result.provenance.complete).toBe(false);
    expect(result.samples.at(-1).time).toBe(7200);
  });
});
