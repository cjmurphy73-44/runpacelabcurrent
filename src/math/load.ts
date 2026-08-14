/**
 * Training Load & Stress Calculation Engine
 * 
 * Implements rTSS (Running Training Stress Score), hrTSS (Heart Rate TSS),
 * and Banister EWMA impulse model for CTL (Fitness), ATL (Fatigue), and TSB (Form).
 */

export interface LoadInputs {
  durationSeconds: number;
  avgPaceSecondsPerKm?: number;
  thresholdPaceSecondsPerKm?: number;
  avgHeartRate?: number;
  restingHeartRate?: number;
  maxHeartRate?: number;
  thresholdHeartRate?: number;
}

export interface TrainingLoadResult {
  tss: number;
  intensityFactor: number;
  calculationMethod: 'rTSS' | 'hrTSS' | 'ESTIMATED_DURATION';
}

/**
 * Calculates Running Training Stress Score (rTSS)
 * Formula: rTSS = (durationSeconds * Pace_IF^2) / 3600 * 100
 * where IF = thresholdPace / avgPace
 */
export function calculaterTSS(
  durationSeconds: number,
  avgPaceSecondsPerKm: number,
  thresholdPaceSecondsPerKm: number
): { tss: number; intensityFactor: number } {
  if (avgPaceSecondsPerKm <= 0 || thresholdPaceSecondsPerKm <= 0) {
    return { tss: 0, intensityFactor: 0 };
  }

  // Intensity Factor (IF) for running is ratio of threshold pace to average pace (speed ratio)
  const intensityFactor = thresholdPaceSecondsPerKm / avgPaceSecondsPerKm;
  const tss = Math.round((durationSeconds * Math.pow(intensityFactor, 2) / 3600) * 100);

  return {
    tss: Math.max(0, tss),
    intensityFactor: Number(intensityFactor.toFixed(3)),
  };
}

/**
 * Calculates Heart Rate Training Stress Score (hrTSS) using HR Reserve Ratio
 */
export function calculatehrTSS(
  durationSeconds: number,
  avgHeartRate: number,
  restingHeartRate: number,
  maxHeartRate: number,
  thresholdHeartRate: number
): { tss: number; intensityFactor: number } {
  const hrReserve = maxHeartRate - restingHeartRate;
  if (hrReserve <= 0) return { tss: 0, intensityFactor: 0 };

  const avgHRR = (avgHeartRate - restingHeartRate) / hrReserve;
  const thresholdHRR = (thresholdHeartRate - restingHeartRate) / hrReserve;

  const intensityFactor = avgHRR / thresholdHRR;
  const tss = Math.round((durationSeconds * Math.pow(intensityFactor, 2) / 3600) * 100);

  return {
    tss: Math.max(0, tss),
    intensityFactor: Number(intensityFactor.toFixed(3)),
  };
}

/**
 * Calculates Exponentially Weighted Moving Average (EWMA) for Fitness (CTL), Fatigue (ATL), and Form (TSB).
 *
 * Time constants:
 * - CTL (Fitness): 42 days
 * - ATL (Fatigue): 7 days
 */
export function calculateEWMA(
  dailyTSSHistory: number[],
  previousCTL: number = 0,
  previousATL: number = 0
): { ctl: number; atl: number; tsb: number } {
  let ctl = previousCTL;
  let atl = previousATL;

  const ctlLambda = 1 - Math.exp(-1 / 42);
  const atlLambda = 1 - Math.exp(-1 / 7);

  for (const tss of dailyTSSHistory) {
    ctl = ctl + (tss - ctl) * ctlLambda;
    atl = atl + (tss - atl) * atlLambda;
  }

  const tsb = ctl - atl;

  return {
    ctl: Number(ctl.toFixed(1)),
    atl: Number(atl.toFixed(1)),
    tsb: Number(tsb.toFixed(1)),
  };
}
