import { describe, expect, it } from 'vitest';
import { calculateNextBanisterState, simulateBanisterSeries } from '../banisterEngine';

const valid = { ctl: 25, atl: 40, tsb: -15 };

describe('Banister model input provenance guards', () => {
  it.each([NaN, Infinity, -Infinity, -1])('rejects invalid daily training load %s', (load) => {
    expect(() => calculateNextBanisterState(valid, load)).toThrow(RangeError);
  });
  it.each([NaN, Infinity, -Infinity, 0, -7])('rejects invalid decay constant %s', (tau) => {
    expect(() => calculateNextBanisterState(valid, 50, tau, 7)).toThrow(RangeError);
    expect(() => calculateNextBanisterState(valid, 50, 42, tau)).toThrow(RangeError);
  });
  it('rejects nonfinite historical state instead of creating invalid readiness', () => {
    for (const key of ['ctl', 'atl', 'tsb'] as const) {
      expect(() => calculateNextBanisterState({ ...valid, [key]: NaN }, 50)).toThrow(RangeError);
    }
  });
  it('stops a timeline on an invalid day rather than silently carrying corrupted state', () => {
    expect(() => simulateBanisterSeries([40, 60, Infinity, 20])).toThrow(RangeError);
  });
  it('preserves finite, deterministic rest-day decay and 42/7 defaults', () => {
    const a = calculateNextBanisterState(valid, 0);
    const b = calculateNextBanisterState(valid, 0, 42, 7);
    expect(a).toEqual(b);
    expect(a.ctl).toBeLessThan(valid.ctl);
    expect(a.atl).toBeLessThan(valid.atl);
    expect(a.tsb).toBeCloseTo(a.ctl - a.atl, 2);
  });
  it('does not mutate the input state', () => {
    const original = Object.freeze({ ...valid });
    calculateNextBanisterState(original, 50);
    expect(original).toEqual(valid);
  });
});
