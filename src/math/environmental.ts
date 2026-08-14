/**
 * Environmental and Biomechanical Pacing Adjustments
 * 
 * Implements Alberto Minetti's metabolic energy cost equation for slope gradients
 * and dynamic thermal performance penalties based on temperature and dew point.
 */

export interface ThermalPenaltyResult {
  /** Penalty percentage applied (e.g. 2.5 means +2.5% slower) */
  penaltyPercentage: number;
  /** Adjusted pace in seconds per kilometer */
  adjustedPaceSeconds: number;
}

/**
 * Calculates Grade Adjusted Pace (GAP) using Minetti's 5th-order metabolic polynomial.
 *
 * @param paceSecondsPerKm - Flat land pace in seconds per kilometer
 * @param inclineGradeDecimal - Gradient as decimal (e.g., +0.05 for +5% incline, -0.05 for -5% decline)
 * @returns Equivalent flat-ground pace in seconds per kilometer
 */
export function calculateMinettiGAP(
  paceSecondsPerKm: number,
  inclineGradeDecimal: number
): number {
  if (paceSecondsPerKm <= 0) {
    throw new Error('Pace must be a positive number');
  }

  const i = inclineGradeDecimal;

  const metabolicCost =
    155.4 * Math.pow(i, 5) -
    30.4 * Math.pow(i, 4) -
    43.3 * Math.pow(i, 3) +
    46.3 * Math.pow(i, 2) +
    19.5 * i +
    3.6;

  const flatCost = 3.6;
  const costRatio = metabolicCost / flatCost;
  const gapPace = paceSecondsPerKm / costRatio;

  return Number(gapPace.toFixed(2));
}

/**
 * Calculates thermal performance penalty based on ambient temperature and dew point.
 *
 * @param tempF - Ambient temperature in degrees Fahrenheit
 * @param dewPointF - Dew point in degrees Fahrenheit
 * @param basePaceSecondsPerKm - Target pace on flat ground under ideal conditions
 * @returns Object containing penalty percentage and thermal-adjusted target pace
 */
export function calculateThermalPenalty(
  tempF: number,
  dewPointF: number,
  basePaceSecondsPerKm: number
): ThermalPenaltyResult {
  if (basePaceSecondsPerKm <= 0) {
    throw new Error('Base pace must be a positive number');
  }

  const thermalSum = tempF + dewPointF;
  const stressIndex = thermalSum - 100;

  const rawPenalty = stressIndex > 0 ? (stressIndex / 2) * 0.5 : 0;
  const penaltyPercentage = Number(rawPenalty.toFixed(2));

  const adjustedPaceSeconds = basePaceSecondsPerKm * (1 + penaltyPercentage / 100);

  return {
    penaltyPercentage,
    adjustedPaceSeconds: Number(adjustedPaceSeconds.toFixed(2)),
  };
}
