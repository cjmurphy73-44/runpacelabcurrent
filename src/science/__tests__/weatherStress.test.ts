// src/science/__tests__/weatherStress.test.ts
import { describe, it, expect } from 'vitest';
import { calculateWeatherStress } from '../weatherStress';

describe('Weather & Environmental Stress Adjustment Engine', () => {
  it('returns no stress penalty for optimal cool conditions (12°C, 50% RH, Sea Level)', () => {
    const result = calculateWeatherStress(100, 240, {
      temperatureC: 12,
      relativeHumidity: 50,
      altitudeMeters: 0,
      windSpeedKmh: 0,
    });

    expect(result.environmentalFactor).toBe(1.0);
    expect(result.adjustedTss).toBe(100);
    expect(result.adjustedPaceSecondsPerKm).toBe(240);
    expect(result.heatIndexCategory).toBe('Optimal');
  });

  it('calculates significant rTSS and pace adjustment for hot & humid conditions (32°C, 85% RH)', () => {
    // 100 raw TSS, 240s/km base pace (4:00/km)
    const result = calculateWeatherStress(100, 240, {
      temperatureC: 32,
      relativeHumidity: 85,
      altitudeMeters: 0,
      windSpeedKmh: 10, // 10 km/h headwind
    });

    expect(result.heatStressMultiplier).toBeGreaterThan(1.08);
    expect(result.windMultiplier).toBeGreaterThan(1.0);
    expect(result.environmentalFactor).toBeGreaterThan(1.10);
    expect(result.adjustedTss).toBeGreaterThan(110);
    expect(result.adjustedPaceSecondsPerKm).toBeGreaterThan(264); // Slower pace
    expect(result.heatIndexCategory).toBe('Extreme Hazard');
  });

  it('applies altitude and tailwind correctly', () => {
    const result = calculateWeatherStress(80, 300, {
      temperatureC: 18,
      relativeHumidity: 45,
      altitudeMeters: 2200, // High altitude (Boulder/Mexico City)
      windSpeedKmh: -15, // 15 km/h tailwind
    });

    expect(result.altitudeMultiplier).toBeGreaterThan(1.03);
    expect(result.windMultiplier).toBeLessThan(1.0); // Tailwind benefit
  });

  it('validates input ranges and throws on invalid inputs', () => {
    expect(() => calculateWeatherStress(-10, 240, { temperatureC: 20, relativeHumidity: 50 })).toThrow();
    expect(() => calculateWeatherStress(100, 0, { temperatureC: 20, relativeHumidity: 50 })).toThrow();
  });
});
