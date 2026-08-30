/**
 * Banister Impulse-Response Model & EWMA Training Load Calculations
 * 
 * Implements TRIMP (Training Impulse) based on heart rate reserve and duration,
 * as well as Exponentially Weighted Moving Average (EWMA) models for Chronic Training Load (CTL),
 * Acute Training Load (ATL), and Training Stress Balance (TSB).
 * 
 * @citation Banister, E. W. (1982). Modeling elite athletic performance. In Physiological Testing of Elite Athletes (pp. 403-424).
 * @citation Banister, E. W., & Calvert, T. W. (1980). Planning for sport: try a computer. Sports Coach, 4(3), 18-21.
 * @assumption Physiological adaptation and fatigue decay exponentially with time constants tau_c = 42 days and tau_a = 7 days.
 * @limitation Heart rate lag during high-intensity intervals and thermal cardiac drift can distort TRIMP values.
 */

import { BanisterLoadInput, FitnessSummary } from './types';

/**
 * Calculates Training Impulse (TRIMP) using Banister's heart rate reserve formula.
 * 
 * @citation Banister EWMA Model (1982)
 * @assumption Heart rate response to continuous exercise scales non-linearly via an exponential weighting coefficient.
 * @limitation Requires accurate resting and maximum heart rate values; affected by cardiac drift.
 */
export function calcTrimp(durationMinutes: number, avgHr: number, restHr: number, maxHr: number, sex: 'male' | 'female' = 'male'): number {
  if (!durationMinutes || durationMinutes <= 0 || !avgHr || !maxHr || maxHr <= restHr) {
    return 0;
  }
  const hrr = Math.max(0, Math.min(1, (avgHr - restHr) / (maxHr - restHr)));
  const isFemale = sex === 'female';
  const a = isFemale ? 0.86 : 0.64;
  const b = isFemale ? 1.67 : 1.92;
  const trimp = durationMinutes * hrr * a * Math.exp(b * hrr);
  return Math.round(trimp * 100) / 100;
}

/**
 * Calculates Chronic Training Load (CTL - Fitness) using EWMA.
 * 
 * @citation Coggan, A., & Banister, E. W. (1990s) EWMA formalism
 * @assumption Fitness accumulates over a 42-day time constant.
 */
export function calculateCTL(previousCtl: number, dailyTss: number, timeConstant: number = 42): number {
  const factor = 1 - Math.exp(-1 / timeConstant);
  return Math.round((previousCtl * Math.exp(-1 / timeConstant) + dailyTss * factor) * 100) / 100;
}

/**
 * Calculates Acute Training Load (ATL - Fatigue) using EWMA.
 * 
 * @citation Coggan, A., & Banister, E. W. (1990s) EWMA formalism
 * @assumption Fatigue accumulates and dissipates rapidly over a 7-day time constant.
 */
export function calculateATL(previousAtl: number, dailyTss: number, timeConstant: number = 7): number {
  const factor = 1 - Math.exp(-1 / timeConstant);
  return Math.round((previousAtl * Math.exp(-1 / timeConstant) + dailyTss * factor) * 100) / 100;
}

/**
 * Calculates Training Stress Balance (TSB - Form).
 * 
 * @citation Banister Impulse-Response Model
 * @assumption Form is defined as the difference between chronic fitness (CTL) and acute fatigue (ATL).
 */
export function calculateTSB(ctl: number, atl: number): number {
  return Math.round((ctl - atl) * 100) / 100;
}

/**
 * Computes a full timeline series of CTL, ATL, and TSB from daily training load inputs.
 * 
 * @citation Banister E. W. & Calvert T. W. (1980)
 * @assumption Initial CTL and ATL start at 0 on the first day unless prior baseline is provided.
 */
export function computeBanisterTimeline(inputs: BanisterLoadInput[], initialCtl: number = 0, initialAtl: number = 0): FitnessSummary[] {
  let currentCtl = initialCtl;
  let currentAtl = initialAtl;

  return inputs.map((day) => {
    currentCtl = calculateCTL(currentCtl, day.tss);
    currentAtl = calculateATL(currentAtl, day.tss);
    const tsb = calculateTSB(currentCtl, currentAtl);
    return {
      date: day.date,
      ctl: currentCtl,
      atl: currentAtl,
      tsb,
    };
  });
}
