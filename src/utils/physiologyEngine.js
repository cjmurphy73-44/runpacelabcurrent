/**
 * Physiology Engine
 * 
 * Provides calculations for training load and intensity metrics.
 */

// CTL = Previous CTL * e^(-1/τc) + Stress * (1 - e^(-1/τc))
export const calculateCTL = (previousCTL, dailyTSS, timeConstant = 42) => {
  const factor = 1 - Math.exp(-1 / timeConstant);
  return previousCTL * Math.exp(-1 / timeConstant) + dailyTSS * factor;
};

// ATL = Previous ATL * e^(-1/τa) + Stress * (1 - e^(-1/τa))
export const calculateATL = (previousATL, dailyTSS, timeConstant = 7) => {
  const factor = 1 - Math.exp(-1 / timeConstant);
  return previousATL * Math.exp(-1 / timeConstant) + dailyTSS * factor;
};

// TSB = CTL - ATL
export const calculateTSB = (ctl, atl) => {
  return ctl - atl;
};

/**
 * Intensity Metrics
 */

/**
 * Estimates VDOT based on performance (Jack Daniels model).
 * @param {number} distanceMeters - Distance of the performance in meters
 * @param {number} timeSeconds - Time taken in seconds
 * @returns {number} Estimated VDOT
 */
export const estimateVDOT = (distanceMeters, timeSeconds) => {
  if (timeSeconds <= 0) return 0;
  
  // VO2 = (-4.6 + 0.182258 * v + 0.000104 * v^2) / (1 - 0.96 * exp(-0.193 * t))
  // where v = velocity in m/min, t = time in minutes
  const velocityMetersPerMin = (distanceMeters / timeSeconds) * 60;
  const timeMinutes = timeSeconds / 60;
  
  const percentMaxVO2 = 0.8 + 0.1894393 * Math.exp(-0.012778 * timeMinutes) + 0.2989558 * Math.exp(-0.1932605 * timeMinutes);
  const vo2 = (-4.6 + 0.182258 * velocityMetersPerMin + 0.000104 * Math.pow(velocityMetersPerMin, 2)) / percentMaxVO2;
  
  return vo2;
};

/**
 * Calculates FTP based on best average power (usually 20-min test).
 * @param {number} p20 - Average power over 20 minutes
 * @returns {number} Estimated FTP
 */
export const calculateFTP = (p20) => {
  // Standard 95% of 20-minute best average power
  return Math.round(p20 * 0.95);
};

/**
 * Calculates Threshold Pace (m/s) based on VDOT.
 * @param {number} vdot - Athlete's current VDOT
 * @returns {number} Threshold pace in m/s
 */
export const calculateThresholdPace = (vdot) => {
  // Simplified derivation for threshold pace from VDOT
  // T-pace is approximately 90% of VO2max velocity
  return vdot * 0.055; 
};
