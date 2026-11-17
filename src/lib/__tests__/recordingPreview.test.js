import { describe, expect, it } from 'vitest';
import { boundedRecordingPreview } from '../../../base44/shared/recordingPreview.ts';

const recording = (count) => Array.from({ length: count }, (_, time) => ({ time, heart_rate: 130 + time % 10 }));
describe('bounded COROS recording preview', () => {
  it('retains complete short recordings with honest provenance', () => {
    const input = recording(1800);
    const result = boundedRecordingPreview(input);
    expect(result.samples).toEqual(input);
    expect(result.provenance).toEqual({ original_samples: 1800, stored_samples: 1800, complete: true, first_time: 0, last_time: 1799 });
  });
  it('covers the entire timespan of long recordings without pretending to be lossless', () => {
    const result = boundedRecordingPreview(recording(14400));
    expect(result.samples).toHaveLength(3600);
    expect(result.samples[0].time).toBe(0);
    expect(result.samples.at(-1).time).toBe(14399);
    expect(result.samples[1800].time).toBeGreaterThan(7000);
    expect(result.provenance).toEqual({ original_samples: 14400, stored_samples: 3600, complete: false, first_time: 0, last_time: 14399 });
    expect(result.samples.every((point, index) => index === 0 || point.time > result.samples[index - 1].time)).toBe(true);
  });
  it('does not silently retain only the first hour', () => {
    const result = boundedRecordingPreview(recording(7201));
    expect(result.samples.at(-1).time).toBe(7200);
    expect(result.provenance.complete).toBe(false);
  });
  it('rejects malformed recording timestamps and unsafe limits', () => {
    expect(() => boundedRecordingPreview([{ time: 1 }, { time: 1 }])).toThrow();
    expect(() => boundedRecordingPreview([{ time: null }])).toThrow();
    expect(() => boundedRecordingPreview([{ time: -1 }, { time: 0 }])).toThrow();
    expect(() => boundedRecordingPreview([{ time: -0.5 }])).toThrow();
    expect(() => boundedRecordingPreview([{ time: 0 }, { time: Infinity }])).toThrow();
    expect(() => boundedRecordingPreview(recording(3), 1)).toThrow();
    expect(() => boundedRecordingPreview(recording(3), 99999)).toThrow();
  });
  it('handles empty recordings without invented timestamps', () => {
    expect(boundedRecordingPreview([]).provenance).toEqual({ original_samples: 0, stored_samples: 0, complete: true, first_time: null, last_time: null });
  });
});
