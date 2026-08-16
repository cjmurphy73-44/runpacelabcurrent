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

// Placeholder for VDOT calculation logic
export const estimateVDOT = (performanceMetric, durationSeconds) => {
  // Logic to be implemented via Multi-model Physiological Engine
  return 0;
};

// Placeholder for FTP calculation
export const calculateFTP = (bestAveragePower) => {
  return bestAveragePower * 0.95;
};
