// src/science/adaptation.ts
// Deterministic adaptation guardrails over a daily load history.
//
//  - ACWR  = ATL (7-day EWMA) / CTL (28-day EWMA) — Gabbett / Blanch & Gabbett.
//            > 1.5 is flagged ACWR_SPIKE_WARNING (injury-risk spike).
//  - Ramp  = Δ CTL over the trailing 7 days. > 7 points/week is flagged
//            HIGH_RAMP_RATE (faster than most athletes absorb).
//  - TSB   = CTL − ATL. Three or more consecutive days below −30 is flagged
//            OVERREACHING_RISK (functional overreaching territory).
//
// Every threshold is a named constant so the summary states exactly what was
// tested, and nothing here is inferred by an LLM.
//
// Sources:
//  - Gabbett, T. 2016. Br J Sports Med 50:273-280 (acute:chronic workload).
//  - Blanch & Gabbett 2016. Br J Sports Med 50:471-475 (EWMA ACWR).
//  - Coggan 2003 (CTL / ATL / TSB performance manager).
//
// Limitations:
//  - ACWR is fragile on short histories; it returns null until both windows have
//    enough load-bearing days (see MIN_ACWR_DAYS).
//  - Load is single-valued per day; multi-session days must be summed first.

import { calculateATL, calculateCTL } from './load';

export const ACWR_SPIKE_THRESHOLD = 1.5;
export const HIGH_RAMP_RATE_POINTS = 7;
export const OVERREACHING_TSB_FLOOR = -30;
export const OVERREACHING_MIN_CONSECUTIVE_DAYS = 3;
export const MIN_ACWR_DAYS = 7;

export const ACWR_SPIKE_WARNING = 'ACWR_SPIKE_WARNING';
export const HIGH_RAMP_RATE = 'HIGH_RAMP_RATE';
export const OVERREACHING_RISK = 'OVERREACHING_RISK';

export type AdaptationFlagCode =
  | "ELEVATED_AEROBIC_DECOUPLING"
  | typeof ACWR_SPIKE_WARNING
  | typeof HIGH_RAMP_RATE
  | typeof OVERREACHING_RISK;

export interface DailyLoadPoint {
  /** ISO date (YYYY-MM-DD). */
  date: string;
  /** Daily training load (sum of session loads). */
  load: number;
}

export interface LoadSeriesPoint extends DailyLoadPoint {
  ctl: number;
  atl: number;
  tsb: number;
}

export interface AdaptationFlagDetail {
  code: AdaptationFlagCode;
  severity: 'warning' | 'critical';
  value: number;
  threshold: number;
  message: string;
}

export interface AdaptationAssessment {
  ctl: number;
  atl: number;
  tsb: number;
  acwr: number | null;
  ctl_ramp_7d: number | null;
  tsb_negative_streak_days: number;
  flags: AdaptationFlagCode[];
  details: AdaptationFlagDetail[];
  series: LoadSeriesPoint[];
}

export interface AdaptationOptions {
  ctlTimeConstantDays?: number;
  atlTimeConstantDays?: number;
  /** Denominator window for ACWR (defaults to the 28-day chronic EWMA). */
  chronicTimeConstantDays?: number;
  initialCtl?: number;
  initialAtl?: number;
  acwrThreshold?: number;
  rampThreshold?: number;
  tsbFloor?: number;
  tsbStreakDays?: number;
}

const round = (value: number, dp = 2): number => {
  if (!Number.isFinite(value)) return 0;
  const f = Math.pow(10, dp);
  return Math.round(value * f) / f;
};

const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

/** Sort + fold same-day sessions into one load point. Deterministic. */
export function normalizeDailyLoads(points: DailyLoadPoint[] | null | undefined): DailyLoadPoint[] {
  const byDate = new Map<string, number>();
  for (const point of points || []) {
    if (!point || typeof point.date !== 'string' || !point.date) continue;
    if (!finite(point.load) || point.load < 0) continue;
    byDate.set(point.date, (byDate.get(point.date) || 0) + point.load);
  }
  return [...byDate.entries()]
    .map(([date, load]) => ({ date, load: round(load, 1) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * EWMA CTL/ATL/TSB timeline. Same recursion as the performance manager so the
 * guardrails read the values the app already stores.
 */
export function buildLoadSeries(
  points: DailyLoadPoint[] | null | undefined,
  options: AdaptationOptions = {},
): LoadSeriesPoint[] {
  const ctlTau = options.ctlTimeConstantDays ?? 42;
  const atlTau = options.atlTimeConstantDays ?? 7;
  let ctl = options.initialCtl ?? 0;
  let atl = options.initialAtl ?? 0;
  return normalizeDailyLoads(points).map((day) => {
    ctl = calculateCTL(ctl, day.load, ctlTau);
    atl = calculateATL(atl, day.load, atlTau);
    return {
      date: day.date,
      load: day.load,
      ctl: round(ctl, 2),
      atl: round(atl, 2),
      tsb: round(ctl - atl, 2),
    };
  });
}

/** Trailing count of days whose TSB stays below the floor. */
export function tsbNegativeStreak(series: LoadSeriesPoint[], floor = OVERREACHING_TSB_FLOOR): number {
  let streak = 0;
  for (let i = series.length - 1; i >= 0; i--) {
    if (series[i].tsb < floor) streak++;
    else break;
  }
  return streak;
}

/** CTL change over the trailing 7 days (null when the history is too short). */
export function ctlRamp7d(series: LoadSeriesPoint[]): number | null {
  if (series.length < 8) return null;
  const delta = series[series.length - 1].ctl - series[series.length - 8].ctl;
  return round(delta, 2);
}

/**
 * ACWR on the 7-day acute vs 28-day chronic EWMA. Returns null until the history
 * is long enough (MIN_ACWR_DAYS) or the chronic load is negligible — a ratio
 * against a near-zero denominator is noise, not a risk signal.
 */
export function acuteChronicRatio(
  points: DailyLoadPoint[] | null | undefined,
  options: AdaptationOptions = {},
): number | null {
  const days = normalizeDailyLoads(points);
  if (days.length < MIN_ACWR_DAYS) return null;

  const atlTau = options.atlTimeConstantDays ?? 7;
  const chronicTau = options.chronicTimeConstantDays ?? 28;
  // Seed both windows from the athlete's opening week. A zero seed makes an
  // otherwise steady block read as a chronic deficit (and so a false ratio
  // above 1) purely because the EWMA is still catching up.
  const seed = days.slice(0, MIN_ACWR_DAYS).reduce((s, d) => s + d.load, 0) / MIN_ACWR_DAYS;
  let atl = seed;
  let chronic = seed;
  for (const day of days) {
    atl = calculateATL(atl, day.load, atlTau);
    chronic = calculateCTL(chronic, day.load, chronicTau);
  }
  if (!finite(chronic) || chronic < 1) return null;
  return round(atl / chronic, 2);
}

/** Full guardrail assessment: series + ACWR + ramp + TSB streak + flags. */
export function evaluateAdaptation(
  points: DailyLoadPoint[] | null | undefined,
  options: AdaptationOptions = {},
): AdaptationAssessment {
  const series = buildLoadSeries(points, options);
  const last = series[series.length - 1] || { ctl: 0, atl: 0, tsb: 0, date: '', load: 0 };
  const acwr = acuteChronicRatio(points, options);
  const ramp = ctlRamp7d(series);
  const streak = tsbNegativeStreak(series, options.tsbFloor ?? OVERREACHING_TSB_FLOOR);

  const acwrThreshold = options.acwrThreshold ?? ACWR_SPIKE_THRESHOLD;
  const rampThreshold = options.rampThreshold ?? HIGH_RAMP_RATE_POINTS;
  const streakThreshold = options.tsbStreakDays ?? OVERREACHING_MIN_CONSECUTIVE_DAYS;

  const details: AdaptationFlagDetail[] = [];
  if (acwr !== null && acwr > acwrThreshold) {
    details.push({
      code: ACWR_SPIKE_WARNING,
      severity: 'critical',
      value: acwr,
      threshold: acwrThreshold,
      message: `Acute:chronic ratio ${acwr} exceeds ${acwrThreshold} — load spiked faster than the chronic base.`,
    });
  }
  if (ramp !== null && ramp > rampThreshold) {
    details.push({
      code: HIGH_RAMP_RATE,
      severity: 'warning',
      value: ramp,
      threshold: rampThreshold,
      message: `Fitness (CTL) rose ${ramp} points in 7 days, above the ${rampThreshold}-point/week guideline.`,
    });
  }
  if (streak >= streakThreshold) {
    details.push({
      code: OVERREACHING_RISK,
      severity: 'critical',
      value: streak,
      threshold: streakThreshold,
      message: `Form (TSB) has stayed below ${options.tsbFloor ?? OVERREACHING_TSB_FLOOR} for ${streak} consecutive days.`,
    });
  }

  return {
    ctl: round(last.ctl, 2),
    atl: round(last.atl, 2),
    tsb: round(last.tsb, 2),
    acwr,
    ctl_ramp_7d: ramp,
    tsb_negative_streak_days: streak,
    flags: details.map((d) => d.code),
    details,
    series,
  };
}