// src/science/weatherStress.ts
/**
 * Weather & Environmental Stress Adjustment Engine
 * 
 * Calculates heat strain index, relative humidity adjustments, altitude & wind penalties,
 * and converts raw training stress into Environmentally Adjusted Relative Effort (rTSS)
 * and Grade-Adjusted Pace (GAP) corrections.
 */

import { calculateDewPoint, celsiusToFahrenheit } from './environment';

export interface WeatherTelemetry {
  temperatureC: number;      // Air temperature in Celsius
  relativeHumidity: number;  // Relative humidity (0 - 100)
  altitudeMeters?: number;   // Altitude above sea level in meters
  windSpeedKmh?: number;     // Headwind/tailwind speed in km/h (+ = headwind, - = tailwind)
}

export interface WeatherStressResult {
  dewPointC: number;
  dewPointF: number;
  heatStressMultiplier: number;  // Multiplier for thermal load (e.g. 1.08 = +8% stress)
  altitudeMultiplier: number;    // Multiplier for altitude strain (e.g. 1.04 = +4% stress)
  windMultiplier: number;        // Multiplier for wind resistance (e.g. 1.02 = +2% stress)
  environmentalFactor: number;   // Combined multiplier for training stress & rTSS
  adjustedTss: number;           // Environmentally adjusted training stress score
  rawTss: number;                // Original raw training stress score
  adjustedPaceSecondsPerKm: number; // Adjusted pace for running / effort equivalent
  heatIndexCategory: 'Optimal' | 'Mild Stress' | 'Moderate Stress' | 'High Stress' | 'Extreme Hazard';
  description: string;
}

/**
 * Calculates environmental stress multipliers and adjusts Training Stress Score (TSS)
 * and pace / relative effort based on temperature, humidity, altitude, and wind.
 */
export function calculateWeatherStress(
  rawTss: number,
  basePaceSecondsPerKm: number,
  weather: WeatherTelemetry
): WeatherStressResult {
  if (rawTss < 0 || isNaN(rawTss)) {
    throw new Error('Raw TSS must be a non-negative number');
  }
  if (basePaceSecondsPerKm <= 0 || isNaN(basePaceSecondsPerKm)) {
    throw new Error('Base pace must be a positive number');
  }

  const tempC = weather.temperatureC;
  const rh = weather.relativeHumidity;
  const altitude = weather.altitudeMeters || 0;
  const wind = weather.windSpeedKmh || 0;

  const dewPointC = calculateDewPoint(tempC, rh);
  const dewPointF = celsiusToFahrenheit(dewPointC);
  const tempF = celsiusToFahrenheit(tempC);
  const tempDewSum = tempF + dewPointF;

  // 1. Heat Strain Index & Multiplier
  let heatStressPercent = 0;
  let heatIndexCategory: WeatherStressResult['heatIndexCategory'] = 'Optimal';

  if (tempDewSum > 100) {
    if (tempDewSum <= 120) {
      heatStressPercent = (tempDewSum - 100) * 0.12; // 0% to 2.4%
      heatIndexCategory = 'Mild Stress';
    } else if (tempDewSum <= 140) {
      heatStressPercent = 2.4 + (tempDewSum - 120) * 0.20; // 2.4% to 6.4%
      heatIndexCategory = 'Moderate Stress';
    } else if (tempDewSum <= 160) {
      heatStressPercent = 6.4 + (tempDewSum - 140) * 0.30; // 6.4% to 12.4%
      heatIndexCategory = 'High Stress';
    } else {
      heatStressPercent = 12.4 + (tempDewSum - 160) * 0.45; // >12.4%
      heatIndexCategory = 'Extreme Hazard';
    }
  } else {
    heatIndexCategory = tempC < 5 ? 'Mild Stress' : 'Optimal';
  }

  const heatStressMultiplier = 1 + heatStressPercent / 100;

  // 2. Altitude Adjustment (~1.2% per 300m above 1,000m)
  let altitudePercent = 0;
  if (altitude > 1000) {
    altitudePercent = ((altitude - 1000) / 300) * 1.2;
  }
  const altitudeMultiplier = 1 + altitudePercent / 100;

  // 3. Wind Penalty (~0.4% per 5 km/h of headwind)
  let windPercent = 0;
  if (wind > 0) {
    windPercent = (wind / 5) * 0.4;
  } else if (wind < 0) {
    // Slight tailwind assistance (diminishing returns)
    windPercent = (wind / 10) * 0.3; // Negative adjustment
  }
  const windMultiplier = Math.max(0.95, 1 + windPercent / 100);

  // Combined Environmental Factor
  const environmentalFactor = Math.round(heatStressMultiplier * altitudeMultiplier * windMultiplier * 1000) / 1000;
  
  // Adjusted rTSS (Relative Training Stress Score)
  const adjustedTss = Math.round(rawTss * environmentalFactor * 10) / 10;

  // Adjusted Effort Pace
  const adjustedPaceSecondsPerKm = Math.round(basePaceSecondsPerKm * environmentalFactor);

  let description = 'Conditions are optimal for training with minimal environmental strain.';
  if (heatIndexCategory === 'Mild Stress') {
    description = 'Slight thermal load detected. Hydration recommended during sustained efforts.';
  } else if (heatIndexCategory === 'Moderate Stress') {
    description = 'Moderate heat and humidity increase cardiovascular drift. Consider adjusting target pace.';
  } else if (heatIndexCategory === 'High Stress') {
    description = 'High environmental stress. Significant heart rate elevation expected. Lower intensity recommended.';
  } else if (heatIndexCategory === 'Extreme Hazard') {
    description = 'Extreme heat stress hazard! High risk of heat illness. Reduce intensity or shift training indoors.';
  }

  return {
    dewPointC,
    dewPointF: Math.round(dewPointF * 10) / 10,
    heatStressMultiplier: Math.round(heatStressMultiplier * 1000) / 1000,
    altitudeMultiplier: Math.round(altitudeMultiplier * 1000) / 1000,
    windMultiplier: Math.round(windMultiplier * 1000) / 1000,
    environmentalFactor,
    adjustedTss,
    rawTss,
    adjustedPaceSecondsPerKm,
    heatIndexCategory,
    description,
  };
}
