import { describe, expect, it } from 'vitest';
import { resolveSessionLoad, integrateStreamTrimp } from '../../../base44/shared/loadModel';

describe('TRIMP HR calibration and provenance', () => {
  it('does not invent a resting HR of 60 when calibration is absent', () => {
    expect(resolveSessionLoad({ durationSeconds: 3600, avgHr: 145, maxHr: 190 })).toMatchObject({
      session_trimp: 0, load_source: 'none',
    });
  });

  it.each([
    [0, 190], [70, 70], [70, 60], [Number.NaN, 190],
  ])('refuses impossible resting/max HR %s/%s', (restHr, maxHr) => {
    expect(resolveSessionLoad({ durationSeconds: 3600, avgHr: 145, restHr, maxHr }).load_source).toBe('none');
  });

  it('does not derive a positive TRIMP from a physiologically impossible average HR', () => {
    expect(resolveSessionLoad({ durationSeconds: 3600, avgHr: 210, restHr: 55, maxHr: 190 }).load_source).toBe('none');
  });

  it('preserves a labelled summary estimate with valid calibrated HR', () => {
    const result = resolveSessionLoad({ durationSeconds: 3600, avgHr: 145, restHr: 55, maxHr: 190 });
    expect(result.load_source).toBe('summary');
    expect(result.session_trimp).toBeGreaterThan(0);
  });

  it('does not integrate impossible stream heart rates', () => {
    const result = integrateStreamTrimp([
      { time: 0, heart_rate: 220 },
      { time: 1, heart_rate: 220 },
      { time: 2, heart_rate: 220 },
    ], 55, 190);
    expect(result.trimp).toBe(0);
    expect(result.covered_seconds).toBe(0);
  });
});
