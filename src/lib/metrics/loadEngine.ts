/**
 * LoadEngine - Core physiological load calculations
 */

export const calculateEWMA = (values: number[], days: number, alpha: number): number => {
  // Simple Exponential Weighted Moving Average
  // For training load: newLoad = oldLoad + alpha * (currentTSS - oldLoad)
  let load = 0;
  values.forEach((v, i) => {
    if (i === 0) load = v;
    else load = load + alpha * (v - load);
  });
  return load;
};

// Simplified TSS calculation (normalized intensity^2 * duration)
export const calculateTSS = (durationMinutes: number, intensityFactor: number): number => {
  return ((durationMinutes / 60) * Math.pow(intensityFactor, 2) * 100);
};

export const calculateMetrics = (dailyTssValues: number[]) => {
  const ctl = calculateEWMA(dailyTssValues, 42, 2 / (42 + 1));
  const atl = calculateEWMA(dailyTssValues, 7, 2 / (7 + 1));
  const tsb = ctl - atl;
  
  return { ctl, atl, tsb };
};
