import { Base44, Base44FunctionContext } from "@base44/cloud";

interface BanisterLoadInput {
  date: string;
  tss: number;
}

interface FitnessSummary {
  date: string;
  ctl: number;
  atl: number;
  tsb: number;
}

interface CalculateBanisterModelArgs {
  durationMinutes?: number;
  avgHr?: number;
  restHr?: number;
  maxHr?: number;
  sex?: 'male' | 'female';
  previousCtl?: number;
  dailyTss?: number;
  timeConstant?: number;
  previousAtl?: number;
  ctl?: number;
  atl?: number;
  inputs?: BanisterLoadInput[];
  initialCtl?: number;
  initialAtl?: number;
}

/**
 * Calculates Training Impulse (TRIMP) using Banister's heart rate reserve formula.
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
 */
export function calculateCTL(previousCtl: number, dailyTss: number, timeConstant: number = 42): number {
  const factor = 1 - Math.exp(-1 / timeConstant);
  return Math.round((previousCtl * Math.exp(-1 / timeConstant) + dailyTss * factor) * 100) / 100;
}

/**
 * Calculates Acute Training Load (ATL - Fatigue) using EWMA.
 */
export function calculateATL(previousAtl: number, dailyTss: number, timeConstant: number = 7): number {
  const factor = 1 - Math.exp(-1 / timeConstant);
  return Math.round((previousAtl * Math.exp(-1 / timeConstant) + dailyTss * factor) * 100) / 100;
}

/**
 * Calculates Training Stress Balance (TSB - Form).
 */
export function calculateTSB(ctl: number, atl: number): number {
  return Math.round((ctl - atl) * 100) / 100;
}

/**
 * Computes a full timeline series of CTL, ATL, and TSB from daily training load inputs.
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

export default async function (
  base44: Base44,
  context: Base44FunctionContext,
  args: CalculateBanisterModelArgs
) {
  const { 
    durationMinutes, avgHr, restHr, maxHr, sex,
    previousCtl, dailyTss, timeConstant, previousAtl,
    ctl, atl, inputs, initialCtl = 0, initialAtl = 0
  } = args;

  if (durationMinutes !== undefined && avgHr !== undefined && restHr !== undefined && maxHr !== undefined && sex !== undefined) {
    return { trimp: calcTrimp(durationMinutes, avgHr, restHr, maxHr, sex) };
  }

  if (previousCtl !== undefined && dailyTss !== undefined && timeConstant !== undefined) {
    return { ctl: calculateCTL(previousCtl, dailyTss, timeConstant) };
  }

  if (previousAtl !== undefined && dailyTss !== undefined && timeConstant !== undefined) {
    return { atl: calculateATL(previousAtl, dailyTss, timeConstant) };
  }

  if (ctl !== undefined && atl !== undefined) {
    return { tsb: calculateTSB(ctl, atl) };
  }

  if (inputs !== undefined) {
    return { timeline: computeBanisterTimeline(inputs, initialCtl, initialAtl) };
  }

  return { error: "Invalid arguments provided for Banister model calculation." };
}
