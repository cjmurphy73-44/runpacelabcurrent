/**
 * Coggan Training Stress Score (TSS), Normalized Power (NP), and Intensity Factor (IF) Engine
 * 
 * Implements Andrew Coggan's power and pace stress metrics for quantifying training load
 * and intensity distribution.
 * 
 * @citation Coggan, A. (2003). Training and Racing with a Power Meter. VeloPress.
 * @assumption Intensity factor scales non-linearly with physiological strain, modeled via fourth-power averaging for power or pace ratios.
 * @limitation Requires accurate functional threshold pace (FTP / rFTPw) or threshold heart rate; inaccurate thresholds skew TSS calculations.
 */

/**
 * Calculates Running Training Stress Score (rTSS) based on threshold pace ratio and duration.
 * 
 * @citation Coggan Training Stress Score formalism
 * @assumption Intensity factor (IF) = thresholdPace / avgPace. TSS = (durationSeconds * IF^2) / 3600 * 100.
 * @limitation Assumes steady-state intensity; highly intermittent pacing without normalized power adjustment can understate physiological cost.
 */
export function calculaterTSS(
  durationSeconds: number,
  avgPaceSecondsPerKm: number,
  thresholdPaceSecondsPerKm: number
): { tss: number; intensityFactor: number } {
  if (!durationSeconds || durationSeconds <= 0 || avgPaceSecondsPerKm <= 0 || thresholdPaceSecondsPerKm <= 0) {
    return { tss: 0, intensityFactor: 0 };
  }

  const intensityFactor = thresholdPaceSecondsPerKm / avgPaceSecondsPerKm;
  const tss = Math.round((durationSeconds * Math.pow(intensityFactor, 2) / 3600) * 100);

  return {
    tss: Math.max(0, tss),
    intensityFactor: Number(intensityFactor.toFixed(3)),
  };
}

/**
 * Calculates Heart Rate Training Stress Score (hrTSS) using Heart Rate Reserve (HRR).
 * 
 * @citation Coggan hrTSS formula
 * @assumption Ratio of operating HRR to threshold HRR reflects metabolic demand.
 */
export function calculatehrTSS(
  durationSeconds: number,
  avgHeartRate: number,
  restingHeartRate: number,
  thresholdHeartRate: number
): { tss: number; intensityFactor: number } {
  if (!durationSeconds || durationSeconds <= 0 || thresholdHeartRate <= restingHeartRate) {
    return { tss: 0, intensityFactor: 0 };
  }

  const operatingHrr = Math.max(0, avgHeartRate - restingHeartRate);
  const thresholdHrr = thresholdHeartRate - restingHeartRate;
  const intensityFactor = operatingHrr / thresholdHrr;

  const tss = Math.round((durationSeconds * Math.pow(intensityFactor, 2) / 3600) * 100);

  return {
    tss: Math.max(0, tss),
    intensityFactor: Number(intensityFactor.toFixed(3)),
  };
}
