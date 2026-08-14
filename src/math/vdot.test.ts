import { describe, expect, it } from 'vitest';
import { calculateVDOT } from './vdot';

describe('calculateVDOT', () => {
  it('correctly calculates VDOT for a 20:00 5K (Benchmark VDOT ~ 50)', () => {
    const vdot = calculateVDOT(1200, 5000);
    expect(vdot).toBeGreaterThanOrEqual(49.5);
    expect(vdot).toBeLessThanOrEqual(50.5);
  });

  it('correctly calculates VDOT for a 40:00 10K (Benchmark VDOT ~ 52)', () => {
    const vdot = calculateVDOT(2400, 10000);
    expect(vdot).toBeGreaterThanOrEqual(51.5);
    expect(vdot).toBeLessThanOrEqual(52.5);
  });

  it('correctly calculates VDOT for a 3:00:00 Marathon (Benchmark VDOT ~ 54)', () => {
    const vdot = calculateVDOT(10800, 42195);
    expect(vdot).toBeGreaterThanOrEqual(53.5);
    expect(vdot).toBeLessThanOrEqual(54.5);
  });

  it('throws an error for non-positive input values', () => {
    expect(() => calculateVDOT(0, 5000)).toThrow('Time and distance must be positive numbers');
    expect(() => calculateVDOT(1200, -100)).toThrow('Time and distance must be positive numbers');
  });
});
