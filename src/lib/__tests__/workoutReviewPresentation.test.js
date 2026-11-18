import { describe, expect, it } from 'vitest';
import { chartSeries, recordingPresentation } from '../workoutReviewPresentation';

const sample = (n) => Array.from({ length: n }, (_, time) => ({ time, heart_rate: 120 + time % 30, speed: 3.5, power: time % 2 ? 0 : 220 }));
describe('workout review provenance and charts', () => {
  it('does not claim archived FIT from a full-duration saved stream', () => {
    const result = recordingPresentation({ duration_seconds: 7200, streams: sample(7201) });
    expect(result.state).toBe('recorded');
    expect(result.coverage).toBe(100);
    expect(result.label).toContain('unverified');
  });
  it('marks first-3600 prefix of two-hour recording partial', () => {
    const result = recordingPresentation({ duration_seconds: 7200, streams: sample(3600) });
    expect(result.state).toBe('partial');
    expect(result.coverage).toBe(50);
  });
  it('does not graph summary-shaped or out-of-order samples', () => {
    expect(recordingPresentation({ duration_seconds: 3600, streams: [{ time: 0, heart_rate: 120 }] }).state).toBe('summary');
    expect(recordingPresentation({ duration_seconds: 3600, streams: [{ time: 2, heart_rate: 120 }, { time: 1, heart_rate: 121 }] }).state).toBe('summary');
  });
  it('limits chart points without altering original stream and preserves coasting zero', () => {
    const original = sample(7201);
    const series = chartSeries(original, 'power');
    expect(series.length).toBeLessThanOrEqual(241);
    expect(series.at(-1).minute).toBe(120);
    expect(series.some(p => p.value === 0)).toBe(true);
    expect(original.length).toBe(7201);
  });
  it('derives pace only from positive measured speed and keeps stops missing', () => {
    expect(chartSeries([{ time: 0, speed: 4 }, { time: 1, speed: 0 }, { time: 2, speed: null }], 'pace').map(p => p.value)).toEqual([4.17, null, null]);
  });
  it('never invents absent heart-rate values', () => {
    expect(chartSeries([{ time: 0, heart_rate: null }, { time: 1, heart_rate: 145 }], 'heart_rate').map(p => p.value)).toEqual([null,145]);
  });
});
