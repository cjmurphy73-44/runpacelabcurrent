import { describe, it, expect } from 'vitest';
import { computeWPrimeStream } from '../wPrimeKinetics';

describe('computeWPrimeStream', () => {
  it('should correctly deplete W\' during a continuous effort above CP', () => {
    const criticalPowerOrSpeed = 200;
    const wPrimeCapacityJoules = 20000;
    const stream = Array.from({ length: 11 }, (_, i) => ({
      timeOffsetSeconds: i,
      outputValue: 250,
    }));

    const config = { criticalPowerOrSpeed, wPrimeCapacityJoules };
    const results = computeWPrimeStream(stream, config);

    expect(results).toHaveLength(11);
    expect(results[10].wPrimeBalanceJoules).toBeCloseTo(19500, 0);
  });

  it('should correctly reconstitute W\' during recovery below CP', () => {
    const criticalPowerOrSpeed = 200;
    const wPrimeCapacityJoules = 20000;
    
    const stream = [
      ...Array.from({ length: 11 }, (_, i) => ({ timeOffsetSeconds: i, outputValue: 250 })),
      ...Array.from({ length: 30 }, (_, i) => ({ timeOffsetSeconds: 11 + i, outputValue: 150 })),
    ];

    const config = { criticalPowerOrSpeed, wPrimeCapacityJoules, tauConstant: 540 };
    const results = computeWPrimeStream(stream, config);

    const depletionResult = results[10];
    expect(depletionResult.wPrimeBalanceJoules).toBeCloseTo(19500, 0);

    const lastResult = results[results.length - 1];
    expect(lastResult.wPrimeBalanceJoules).toBeGreaterThan(19500);
    expect(lastResult.wPrimeBalanceJoules).toBeLessThanOrEqual(wPrimeCapacityJoules);
  });

  it('should handle zero stream length gracefully', () => {
    const results = computeWPrimeStream([], { criticalPowerOrSpeed: 200, wPrimeCapacityJoules: 20000 });
    expect(results).toEqual([]);
  });

  it('should not deplete W\' if outputValue is below CP', () => {
    const stream = Array.from({ length: 10 }, (_, i) => ({
      timeOffsetSeconds: i,
      outputValue: 150,
    }));

    const results = computeWPrimeStream(stream, { criticalPowerOrSpeed: 200, wPrimeCapacityJoules: 20000 });
    results.forEach((r) => {
      expect(r.wPrimeBalanceJoules).toEqual(20000);
    });
  });

  it('should handle different interval densities and varying power outputs', () => {
    const stream = [
      { timeOffsetSeconds: 0, outputValue: 300 },
      { timeOffsetSeconds: 1, outputValue: 300 }, // Depletes
      { timeOffsetSeconds: 11, outputValue: 100 }, // Recovers over 10s
      { timeOffsetSeconds: 12, outputValue: 300 }, // Depletes again
    ];

    const results = computeWPrimeStream(stream, { criticalPowerOrSpeed: 200, wPrimeCapacityJoules: 20000 });
    expect(results).toHaveLength(4);
    expect(results[0].wPrimeBalanceJoules).toEqual(20000);
    expect(results[1].wPrimeBalanceJoules).toBeLessThan(20000);
    expect(results[2].wPrimeBalanceJoules).toBeGreaterThan(results[1].wPrimeBalanceJoules);
    expect(results[3].wPrimeBalanceJoules).toBeLessThan(results[2].wPrimeBalanceJoules);
  });

  it('should use the Skiba formula for tau if tauConstant is not provided', () => {
    const criticalPowerOrSpeed = 200;
    const wPrimeCapacityJoules = 20000;
    
    const stream = [
      ...Array.from({ length: 6 }, (_, i) => ({ timeOffsetSeconds: i, outputValue: 300 })),
      ...Array.from({ length: 60 }, (_, i) => ({ timeOffsetSeconds: 6 + i, outputValue: 100 })),
    ];

    const results = computeWPrimeStream(stream, { criticalPowerOrSpeed, wPrimeCapacityJoules });

    const depletionResult = results[5];
    const recoveryResult = results[results.length - 1];

    expect(depletionResult.wPrimeBalanceJoules).toBeLessThan(wPrimeCapacityJoules);
    expect(recoveryResult.wPrimeBalanceJoules).toBeGreaterThan(depletionResult.wPrimeBalanceJoules);
  });
});
