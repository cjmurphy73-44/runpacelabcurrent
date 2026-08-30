import { describe, it, expect } from 'vitest';
import {
  calculateDewPoint,
  celsiusToFahrenheit,
  adjustPaceForEnvironment,
} from './environmental';

describe('Environmental Weather Pace Adjuster Engine', () => {
  it('correctly calculates dew point for 25C and 80% humidity', () => {
    const dewPoint = calculateDewPoint(25, 80);
    expect(dewPoint).toBeGreaterThanOrEqual(21);
    expect(dewPoint).toBeLessThanOrEqual(22);
  });

  it('converts Celsius to Fahrenheit accurately', () => {
    expect(celsiusToFahrenheit(0)).toBe(32);
    expect(celsiusToFahrenheit(25)).toBe(77);
  });

  it('returns no pace penalty for ideal cool conditions (12C, 50% RH, Sea Level)', () => {
    const result = adjustPaceForEnvironment(240, {
      temperatureC: 12,
      relativeHumidity: 50,
      altitudeMeters: 0,
    });

    expect(result.adjustedPaceSecondsPerKm).toBe(240);
    expect(result.paceImpactSecondsPerKm).toBe(0);
    expect(result.formattedAdjustedPace).toBe('4:00 /km');
  });

  it('calculates significant slowdown for hot & humid day (32C, 85% RH)', () => {
    // 4:00/km base pace = 240 seconds
    const result = adjustPaceForEnvironment(240, {
      temperatureC: 32,
      relativeHumidity: 85,
    });

    expect(result.adjustedPaceSecondsPerKm).toBeGreaterThan(260); // Should slow down >20s/km
    expect(result.totalPaceMultiplier).toBeGreaterThan(1.10);
  });

  it('applies altitude penalty at high elevation (2200m altitude)', () => {
    const seaLevelResult = adjustPaceForEnvironment(240, {
      temperatureC: 15,
      relativeHumidity: 50,
      altitudeMeters: 0,
    });

    const highAltitudeResult = adjustPaceForEnvironment(240, {
      temperatureC: 15,
      relativeHumidity: 50,
      altitudeMeters: 2200, // Mexico City / Boulder elevation
    });

    expect(highAltitudeResult.adjustedPaceSecondsPerKm).toBeGreaterThan(seaLevelResult.adjustedPaceSecondsPerKm);
    expect(highAltitudeResult.altitudeFactor).toBeGreaterThan(1.03);
  });

  it('throws error for invalid pace but clamps out-of-range humidity', () => {
    // Invalid (non-positive) pace still throws.
    expect(() =>
      adjustPaceForEnvironment(-100, { temperatureC: 20, relativeHumidity: 50 })
    ).toThrow();

    // 0% humidity no longer yields a NaN dew point (clamped to 1%).
    const zeroRh = adjustPaceForEnvironment(240, { temperatureC: 20, relativeHumidity: 0 });
    expect(Number.isFinite(zeroRh.dewPointC)).toBe(true);
    expect(typeof zeroRh.formattedAdjustedPace).toBe("string");

    // 120% humidity is clamped to 100% rather than throwing.
    const overRh = adjustPaceForEnvironment(240, { temperatureC: 20, relativeHumidity: 120 });
    expect(overRh.adjustedPaceSecondsPerKm).toBeGreaterThanOrEqual(240);
  });
});