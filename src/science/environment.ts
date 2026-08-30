// src/science/environment.ts
// Dew point (Magnus–Tetens), heat-stress pace adjustment, and altitude penalty.
// Pure functions.
//
// Sources:
//  - Magnus–Tetens dew-point formula (Alduchov & Eskridge 1996 improvement):
//      α = (17.27·T)/(T+237.7) + ln(RH/100);  Td = (237.7·α)/(17.27−α)
//  - Heat-stress pace adjustment: empirical runner coach consensus
//    (temp °F + dew point °F, optimal < 100). Bands model NASEM/NOAA heat-index
//    guidance adapted to pacing slowdown.
//  - Altitude: ~1% pace loss per 300 m above 1000 m (Daniel & Jones altitude
//    performance decline).
//
// Limitations:
//  - Heat bands are heuristic, not derived from a physiological model; they
//    reproduce commonly published coach guidance.
//  - Acclimatization is ignored (an athlete 2 weeks at altitude loses most of
//    the penalty).

export function calculateDewPoint(temperatureC: number, relativeHumidity: number): number {
  const clampedRh = Math.max(1, Math.min(100, relativeHumidity));
  const a = 17.27, b = 237.7;
  const alpha = (a * temperatureC) / (b + temperatureC) + Math.log(clampedRh / 100);
  const dewPoint = (b * alpha) / (a - alpha);
  return Math.round(dewPoint * 10) / 10;
}

export function celsiusToFahrenheit(c: number): number {
  return (c * 9) / 5 + 32;
}

function formatPace(secPerKm: number): string {
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${s < 10 ? '0' : ''}${s} /km`;
}

export interface PaceAdjustmentResult {
  dewPointC: number; dewPointF: number;
  heatStressFactor: number; altitudeFactor: number;
  totalPaceMultiplier: number;
  adjustedPaceSecondsPerKm: number; originalPaceSecondsPerKm: number;
  paceImpactSecondsPerKm: number; formattedAdjustedPace: string;
}

export function adjustPaceForEnvironment(targetPaceSecondsPerKm: number, weather: {
  temperatureC: number; relativeHumidity: number; altitudeMeters?: number;
}): PaceAdjustmentResult {
  if (targetPaceSecondsPerKm <= 0 || isNaN(targetPaceSecondsPerKm)) {
    throw new Error('Target pace must be a positive number');
  }
  const dewPointC = calculateDewPoint(weather.temperatureC, weather.relativeHumidity);
  const dewPointF = celsiusToFahrenheit(dewPointC);
  const tempF = celsiusToFahrenheit(weather.temperatureC);
  const sumF = tempF + dewPointF;

  let heatStressPercent = 0;
  if (sumF > 100) {
    if (sumF <= 120) heatStressPercent = (sumF - 100) * 0.15;
    else if (sumF <= 140) heatStressPercent = 3 + (sumF - 120) * 0.25;
    else if (sumF <= 160) heatStressPercent = 8 + (sumF - 140) * 0.35;
    else heatStressPercent = 15 + (sumF - 160) * 0.5;
  }
  const heatStressFactor = 1 + heatStressPercent / 100;

  const alt = weather.altitudeMeters || 0;
  let altitudePercent = 0;
  if (alt > 1000) altitudePercent = ((alt - 1000) / 300) * 1.0;
  const altitudeFactor = 1 + altitudePercent / 100;

  const totalPaceMultiplier = heatStressFactor * altitudeFactor;
  const adjustedPaceSecondsPerKm = Math.round(targetPaceSecondsPerKm * totalPaceMultiplier);
  return {
    dewPointC, dewPointF: Math.round(dewPointF * 10) / 10,
    heatStressFactor: Math.round(heatStressFactor * 1000) / 1000,
    altitudeFactor: Math.round(altitudeFactor * 1000) / 1000,
    totalPaceMultiplier: Math.round(totalPaceMultiplier * 1000) / 1000,
    adjustedPaceSecondsPerKm, originalPaceSecondsPerKm: targetPaceSecondsPerKm,
    paceImpactSecondsPerKm: adjustedPaceSecondsPerKm - targetPaceSecondsPerKm,
    formattedAdjustedPace: formatPace(adjustedPaceSecondsPerKm),
  };
}

// --- Race-aware heat score (°F + dew °F) and linear band penalties. ----------
export function heatScore(airTempF: number, dewPointF: number): number {
  if (!Number.isFinite(airTempF) || !Number.isFinite(dewPointF)) return 0;
  return airTempF + dewPointF;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

export function heatAdjustmentFactor(airTempF: number, dewPointF: number): number {
  const score = heatScore(airTempF, dewPointF);
  if (!Number.isFinite(score) || score <= 110) return 1.0;
  if (score <= 130) return 1.0 + lerp(0.005, 0.02, (score - 110) / 20);
  if (score <= 150) return 1.0 + lerp(0.02, 0.045, (score - 130) / 20);
  if (score <= 170) return 1.0 + lerp(0.045, 0.08, (score - 150) / 20);
  return 1.0 + 0.08 + ((score - 170) / 30) * 0.02;
}

export function heatIsDangerous(airTempF: number, dewPointF: number): boolean {
  return heatScore(airTempF, dewPointF) > 170;
}