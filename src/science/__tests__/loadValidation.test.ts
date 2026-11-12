import { describe, expect, it } from 'vitest';
import { calculaterTSS, calculatehrTSS } from '../load';

describe('load calculations reject invalid measurements', () => {
  it('preserves threshold-intensity rTSS for a one-hour run', () => {
    expect(calculaterTSS(3600, 240, 240)).toEqual({ tss: 100, intensityFactor: 1 });
  });
  it.each([
    [NaN, 240, 240], [Infinity, 240, 240], [-100, 240, 240],
    [3600, NaN, 240], [3600, 240, Infinity], [3600, 0, 240],
  ])('returns zero rather than invalid rTSS for %s, %s, %s', (duration, pace, threshold) => {
    expect(calculaterTSS(duration, pace, threshold)).toEqual({ tss: 0, intensityFactor: 0 });
  });
  it('preserves threshold-intensity hrTSS for a one-hour session', () => {
    expect(calculatehrTSS(3600, 160, 50, 190, 160)).toEqual({ tss: 100, intensityFactor: 1 });
  });
  it.each([
    [NaN, 160, 50, 190, 160],
    [3600, Infinity, 50, 190, 160],
    [3600, 160, 50, 190, 50],
    [3600, 195, 50, 190, 160],
    [3600, 160, 50, 190, 200],
    [-1, 160, 50, 190, 160],
  ])('returns zero for invalid HR-derived load', (duration, avg, rest, max, threshold) => {
    expect(calculatehrTSS(duration, avg, rest, max, threshold)).toEqual({ tss: 0, intensityFactor: 0 });
  });
});
