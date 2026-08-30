// src/science/load.ts
// Training-load impulse-response model. Pure functions — no React, no I/O.
//
// Source: Coggan, A. "Training Stress Score (TSS)" and the Performance Manager
// Chart (PMC), 2003. The fitness/fatigue EWMA's time constants (τc = 42d, τa = 7d)
// are Coggan's canonical values. rTSS is the running-form analog of TSS using
// pace-based intensity factor (Coggan 2003 / McGaw). hrTSS uses HR-reserve ratio
// against lactate-threshold HR.
//
// Limitations:
//  - EWMA conflates intensity and volume; two days with equal TSS but different
//    intensity contribute identically to CTL/ATL.
//  - The model is stress-only: it ignores adaptation capacity, which varies by
//    individual and training history.

/** One-day chronic training load (CTL) update. */
export function calculateCTL(previousCTL: number, dailyTSS: number, timeConstantDays = 42): number {
  const decay = Math.exp(-1 / timeConstantDays);
  const factor = 1 - decay;
  return previousCTL * decay + dailyTSS * factor;
}

/** One-day acute training load (ATL) update. */
export function calculateATL(previousATL: number, dailyTSS: number, timeConstantDays = 7): number {
  const decay = Math.exp(-1 / timeConstantDays);
  const factor = 1 - decay;
  return previousATL * decay + dailyTSS * factor;
}

/** Training Stress Balance (Form) = CTL − ATL. */
export function calculateTSB(ctl: number, atl: number): number {
  return ctl - atl;
}

/** Iterative EWMA over a daily TSS series. Returns rounded {ctl, atl, tsb}. */
export function calculateEWMA(
  dailyTSSHistory: number[],
  previousCTL = 0,
  previousATL = 0,
  ctlTauDays = 42,
  atlTauDays = 7,
): { ctl: number; atl: number; tsb: number } {
  let ctl = previousCTL;
  let atl = previousATL;
  const ctlLambda = 1 - Math.exp(-1 / ctlTauDays);
  const atlLambda = 1 - Math.exp(-1 / atlTauDays);
  for (const tss of dailyTSSHistory) {
    ctl = ctl + (tss - ctl) * ctlLambda;
    atl = atl + (tss - atl) * atlLambda;
  }
  const roundedCTL = Number(ctl.toFixed(1));
  const roundedATL = Number(atl.toFixed(1));
  return { ctl: roundedCTL, atl: roundedATL, tsb: Number((roundedCTL - roundedATL).toFixed(1)) };
}

/** Running Training Stress Score (rTSS). IF = thresholdPace / avgPace (sec/km). */
export function calculaterTSS(
  durationSeconds: number,
  avgPaceSecondsPerKm: number,
  thresholdPaceSecondsPerKm: number,
): { tss: number; intensityFactor: number } {
  if (avgPaceSecondsPerKm <= 0 || thresholdPaceSecondsPerKm <= 0) {
    return { tss: 0, intensityFactor: 0 };
  }
  const intensityFactor = thresholdPaceSecondsPerKm / avgPaceSecondsPerKm;
  const tss = Math.round((durationSeconds * Math.pow(intensityFactor, 2) / 3600) * 100);
  return { tss: Math.max(0, tss), intensityFactor: Number(intensityFactor.toFixed(3)) };
}

/** Heart-Rate TSS using HR-reserve ratio vs lactate-threshold HR. */
export function calculatehrTSS(
  durationSeconds: number,
  avgHeartRate: number,
  restingHeartRate: number,
  maxHeartRate: number,
  thresholdHeartRate: number,
): { tss: number; intensityFactor: number } {
  const hrReserve = maxHeartRate - restingHeartRate;
  if (hrReserve <= 0) return { tss: 0, intensityFactor: 0 };
  const avgHRR = (avgHeartRate - restingHeartRate) / hrReserve;
  const thresholdHRR = (thresholdHeartRate - restingHeartRate) / hrReserve;
  const intensityFactor = avgHRR / thresholdHRR;
  const tss = Math.round((durationSeconds * Math.pow(intensityFactor, 2) / 3600) * 100);
  return { tss: Math.max(0, tss), intensityFactor: Number(intensityFactor.toFixed(3)) };
}