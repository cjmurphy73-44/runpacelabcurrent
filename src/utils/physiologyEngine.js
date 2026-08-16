/**
 * Physiology Engine for Endurance Sports
 * Calculates training loads (CTL, ATL, TSB) and intensity metrics (VDOT, FTP, etc.)
 */

/**
 * Calculates exponentially weighted moving averages for training load
 * @param {number} dailyStressScore - The TSS of the day
 * @param {number} previousLoad - The load from the previous day
 * @param {number} timeConstant - Days for decay (e.g., 42 for CTL, 7 for ATL)
 * @returns {number} The new load
 */
export const calculateNextLoad = (dailyStressScore, previousLoad, timeConstant) => {
  return previousLoad + (dailyStressScore - previousLoad) * (1 - Math.exp(-1 / timeConstant));
};

/**
 * Training Stress Balance (TSB)
 * @param {number} ctl - Chronic Training Load (long-term fatigue/fitness)
 * @param {number} atl - Acute Training Load (short-term fatigue)
 * @returns {number} TSB = Previous Day CTL - Previous Day ATL
 */
export const calculateTSB = (ctl, atl) => ctl - atl;

/**
 * Placeholder for future multi-model intensity calculations
 * (VDOT, FTP, Threshold Pace)
 */
export const calculateIntensityMetrics = (data) => {
  // To be implemented: complex logic for VDOT/FTP estimation
  return {
    vdot: data.vdot_estimate || 0,
    ftp: data.ftp_watts || 0,
    thresholdPace: data.functional_threshold_pace_ms || 0,
  };
};
