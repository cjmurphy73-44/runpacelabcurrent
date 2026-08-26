/**
 * Environmental Weather & Altitude Pace Adjuster Engine
 * 
 * Adjusts running target pace based on heat, humidity, dew point, and altitude.
 * Primary models used:
 * - Dew Point via Magnus-Tetens formula
 * - Heat Stress Factor (% slowdown per °C above optimal ~10-15°C)
 * - Altitude adjustment factor (~1% slowdown per 300m above 1,000m)
 */

export interface WeatherCondition {
  temperatureC: number;      // Temperature in Celsius
  relativeHumidity: number; // 0 - 100 percentage
  altitudeMeters?: number;  // Altitude above sea level in meters (optional)
}

export interface PaceAdjustmentResult {
  dewPointC: number;
  dewPointF: number;
  heatStressFactor: number;   // e.g. 1.05 = 5% pace adjustment
  altitudeFactor: number;     // e.g. 1.02 = 2% altitude penalty
  totalPaceMultiplier: number;// Combined adjustment multiplier
  adjustedPaceSecondsPerKm: number;
  originalPaceSecondsPerKm: number;
  paceImpactSecondsPerKm: number; // Seconds added per km
  formattedAdjustedPace: string;
}

/**
 * Calculates Dew Point in Celsius using the Magnus-Tetens formula.
 */
export function calculateDewPoint(temperatureC: number, relativeHumidity: number): number {
  // Clamp humidity to [1, 100] so Math.log(0) can never produce -Infinity and a
  // NaN dew point that would propagate into UI components. Out-of-range inputs
  // (e.g. 0%, 120%, or negative) are coerced to the valid range rather than throwing.
  const clampedRh = Math.max(1, Math.min(100, relativeHumidity));

  const a = 17.27;
  const b = 237.7;
  const alpha = ((a * temperatureC) / (b + temperatureC)) + Math.log(clampedRh / 100);
  const dewPoint = (b * alpha) / (a - alpha);

  return Math.round(dewPoint * 10) / 10;
}

/**
 * Converts Celsius to Fahrenheit.
 */
export function celsiusToFahrenheit(celsius: number): number {
  return (celsius * 9) / 5 + 32;
}

/**
 * Formats seconds per km to MM:SS string.
 */
function formatPace(paceSecondsPerKm: number): string {
  const mins = Math.floor(paceSecondsPerKm / 60);
  const secs = Math.round(paceSecondsPerKm % 60);
  const paddedSecs = secs < 10 ? `0${secs}` : `${secs}`;
  return `${mins}:${paddedSecs} /km`;
}

/**
 * Calculates overall pace adjustment multiplier from temperature, humidity, and altitude.
 */
export function adjustPaceForEnvironment(
  targetPaceSecondsPerKm: number,
  weather: WeatherCondition
): PaceAdjustmentResult {
  if (targetPaceSecondsPerKm <= 0 || isNaN(targetPaceSecondsPerKm)) {
    throw new Error('Target pace must be a positive number');
  }

  const dewPointC = calculateDewPoint(weather.temperatureC, weather.relativeHumidity);
  const dewPointF = celsiusToFahrenheit(dewPointC);
  const tempF = celsiusToFahrenheit(weather.temperatureC);

  // 1. Calculate Heat Stress Adjustment based on Dew Point + Temperature sum
  // Optimal running temp + dewpoint sum in Fahrenheit is < 100
  const tempDewPointSum = tempF + dewPointF;
  let heatStressPercent = 0;

  if (tempDewPointSum > 100) {
    if (tempDewPointSum <= 120) {
      heatStressPercent = (tempDewPointSum - 100) * 0.15; // ~1-3% slowdown
    } else if (tempDewPointSum <= 140) {
      heatStressPercent = 3 + (tempDewPointSum - 120) * 0.25; // ~3-8% slowdown
    } else if (tempDewPointSum <= 160) {
      heatStressPercent = 8 + (tempDewPointSum - 140) * 0.35; // ~8-15% slowdown
    } else {
      heatStressPercent = 15 + (tempDewPointSum - 160) * 0.5; // >15% severe slowdown
    }
  }

  const heatStressFactor = 1 + heatStressPercent / 100;

  // 2. Calculate Altitude Adjustment (~1% per 300m above 1000m)
  const altitudeMeters = weather.altitudeMeters || 0;
  let altitudePercent = 0;
  if (altitudeMeters > 1000) {
    altitudePercent = ((altitudeMeters - 1000) / 300) * 1.0;
  }
  const altitudeFactor = 1 + altitudePercent / 100;

  // Combined Multiplier
  const totalPaceMultiplier = heatStressFactor * altitudeFactor;
  const adjustedPaceSecondsPerKm = Math.round(targetPaceSecondsPerKm * totalPaceMultiplier);
  const paceImpactSecondsPerKm = adjustedPaceSecondsPerKm - targetPaceSecondsPerKm;

  return {
    dewPointC,
    dewPointF: Math.round(dewPointF * 10) / 10,
    heatStressFactor: Math.round(heatStressFactor * 1000) / 1000,
    altitudeFactor: Math.round(altitudeFactor * 1000) / 1000,
    totalPaceMultiplier: Math.round(totalPaceMultiplier * 1000) / 1000,
    adjustedPaceSecondsPerKm,
    originalPaceSecondsPerKm: targetPaceSecondsPerKm,
    paceImpactSecondsPerKm,
    formattedAdjustedPace: formatPace(adjustedPaceSecondsPerKm),
  };
}