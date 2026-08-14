import { describe, expect, it } from 'vitest';
import { calculateMinettiGAP, calculateThermalPenalty } from './environmental';

describe('calculateMinettiGAP', () => {
  it('returns exact same pace for flat ground (grade = 0)', () => {
    const gap = calculateMinettiGAP(300, 0);
    expect(gap).toBe(300);
  });

  it('calculates equivalent flat pace for steep uphill (+10% incline)', () => {
    const gap = calculateMinettiGAP(300, 0.10);
    expect(gap).toBeLessThan(300);
    expect(gap).toBeGreaterThan(100);
  });

  it('calculates equivalent flat pace for moderate downhill (-5% decline)', () => {
    const gap = calculateMinettiGAP(300, -0.05);
    expect(gap).toBeGreaterThan(300);
  });

  it('throws error for non-positive pace', () => {
    expect(() => calculateMinettiGAP(0, 0.05)).toThrow('Pace must be a positive number');
  });
});

describe('calculateThermalPenalty', () => {
  it('applies 0% penalty for cool/ideal conditions (60°F + 35°F dew point = 95)', () => {
    const result = calculateThermalPenalty(60, 35, 300);
    expect(result.penaltyPercentage).toBe(0);
    expect(result.adjustedPaceSeconds).toBe(300);
  });

  it('calculates penalty for high heat and humidity (80°F + 70°F dew point = 150)', () => {
    const result = calculateThermalPenalty(80, 70, 300);
    expect(result.penaltyPercentage).toBe(12.5);
    expect(result.adjustedPaceSeconds).toBe(337.5);
  });

  it('throws error for non-positive base pace', () => {
    expect(() => calculateThermalPenalty(80, 70, -10)).toThrow('Base pace must be a positive number');
  });
});
