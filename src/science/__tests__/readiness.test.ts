import { describe, it, expect } from 'vitest';
import { computeHolisticReadiness } from '../readiness';

describe('computeHolisticReadiness', () => {
  it('calculates optimal readiness when metrics exceed baseline and TSB is positive', () => {
    const result = computeHolisticReadiness(
      { hrvMs: 75, sleepScore: 90, restingHr: 52 },
      { hrvMean: 60, hrvStdDev: 5, restingHrMean: 55, restingHrStdDev: 3 },
      10
    );

    expect(result.score).toBeGreaterThanOrEqual(85);
    expect(result.status).toBe('Optimal');
    expect(result.details.hrvZScore).toBe(3); // (75-60)/5 = 3
    expect(result.details.restingHrDelta).toBe(-3); // 52-55 = -3
  });

  it('handles high fatigue status when HRV is suppressed, RHR is elevated, and TSB is low', () => {
    const result = computeHolisticReadiness(
      { hrvMs: 40, sleepScore: 50, restingHr: 68 },
      { hrvMean: 60, hrvStdDev: 5, restingHrMean: 54, restingHrStdDev: 3 },
      -25
    );

    expect(result.score).toBeLessThan(50);
    expect(result.status).toBe('High Fatigue');
  });

  it('handles missing baselines and partial data gracefully with neutral fallbacks', () => {
    const result = computeHolisticReadiness({ sleepScore: 75 });
    expect(result.score).toBeGreaterThan(0);
    expect(result.status).not.toBe('Insufficient Data');
  });

  it('returns Insufficient Data with null score when all metrics are null/undefined', () => {
    const result = computeHolisticReadiness({});
    expect(result.status).toBe('Insufficient Data');
    expect(result.score).toBeNull();
    expect(result.validSignalCount).toBe(0);
  });
  it('rejects NaN, infinity, negative physiological values and invalid TSB rather than fabricating readiness', () => {
    const result = computeHolisticReadiness(
      { hrvMs: Number.NaN, sleepScore: Number.POSITIVE_INFINITY, restingHr: -4 },
      { hrvMean: 60, hrvStdDev: 5, restingHrMean: 55 },
      Number.NEGATIVE_INFINITY
    );
    expect(result.score).toBeNull();
    expect(result.status).toBe('Insufficient Data');
    expect(result.validSignalCount).toBe(0);
    expect(result.details.tsb).toBeUndefined();
  });

  it('uses valid sleep while excluding invalid HRV, resting HR and TSB', () => {
    const result = computeHolisticReadiness(
      { hrvMs: -1, sleepScore: 80, restingHr: Number.NaN },
      { hrvMean: 60, hrvStdDev: 5, restingHrMean: 55 },
      Number.POSITIVE_INFINITY
    );
    expect(result.validSignalCount).toBe(1);
    expect(result.score).not.toBeNull();
    expect(Number.isFinite(result.score)).toBe(true);
  });

  it('falls back safely when baselines are nonfinite or physiologically invalid', () => {
    const result = computeHolisticReadiness(
      { hrvMs: 60, restingHr: 55 },
      { hrvMean: Number.NaN, hrvStdDev: 0, restingHrMean: Number.POSITIVE_INFINITY }
    );
    expect(result.validSignalCount).toBe(2);
    expect(result.details.hrvZScore).toBeUndefined();
    expect(result.details.restingHrDelta).toBeUndefined();
    expect(Number.isFinite(result.score)).toBe(true);
  });

  it('does not count out-of-range sleep scores as valid measurements', () => {
    const result = computeHolisticReadiness({ sleepScore: 130 });
    expect(result.score).toBeNull();
    expect(result.validSignalCount).toBe(0);
  });

});