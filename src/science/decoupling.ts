// src/science/decoupling.ts
// Aerobic Efficiency Factor and decoupling (Pa:Hr / Pw:Hr).
//
// Convention per sport (this is what "pace" means here):
//  - Running / swimming: the workload channel is SPEED (m/s), never sec/km.
//    Efficiency Factor = speed / HR, so a higher EF is better and a positive
//    drift means efficiency deteriorated in the second half.
//  - Cycling: the workload channel is POWER (watts).
//
// Drift = (EF₁ − EF₂) / EF₁ × 100, computed over the first and second halves of
// the session after a short warm-up is removed. > 5.0% is flagged
// "ELEVATED_AEROBIC_DECOUPLING" (Friel / TrainingPeaks convention).
//
// Limitations:
//  - Only meaningful for steady aerobic work ≥ 45 min; intervals, stoplights and
//    long descents produce drift that is not cardiac.
//  - Needs a genuine measured HR channel in both halves.

export type DecouplingMetric = 'Pa:Hr' | 'Pw:Hr';

export const DECOUPLING_WARMUP_SECONDS = 300;
export const DECOUPLING_MIN_DURATION_MINUTES = 45;
export const ELEVATED_DECOUPLING_THRESHOLD_PCT = 5;
export const DECOUPLING_MIN_SAMPLES_PER_HALF = 10;

export const ELEVATED_AEROBIC_DECOUPLING = 'ELEVATED_AEROBIC_DECOUPLING';

export interface DecouplingSample {
  time: number;
  /** Speed in m/s for pace sports, watts for cycling. */
  value: number;
  heartRate?: number | null;
}

export interface DecouplingResult {
  metric: DecouplingMetric;
  efficiency_factor: number | null;
  first_half_efficiency: number | null;
  second_half_efficiency: number | null;
  first_half_hr: number | null;
  second_half_hr: number | null;
  decoupling_pct: number | null;
  flag: typeof ELEVATED_AEROBIC_DECOUPLING | null;
  evaluated: boolean;
}

const round = (value: number, dp = 2): number => {
  if (!Number.isFinite(value)) return 0;
  const f = Math.pow(10, dp);
  return Math.round(value * f) / f;
};

const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

function mean(values: number[]): number | null {
  const clean = values.filter((v) => finite(v));
  if (clean.length === 0) return null;
  return clean.reduce((s, v) => s + v, 0) / clean.length;
}

/** Seconds per kilometre → metres per second (the decoupling workload unit). */
export function speedFromPaceSeconds(paceSecPerKm: number): number {
  if (!paceSecPerKm || paceSecPerKm <= 0) return 0;
  return 1000 / paceSecPerKm;
}

/** EF = normalised workload / average heart rate. */
export function efficiencyFactor(normalizedWorkload: number, avgHeartRate: number): number | null {
  if (!finite(normalizedWorkload) || normalizedWorkload <= 0) return null;
  if (!finite(avgHeartRate) || avgHeartRate <= 0) return null;
  return round(normalizedWorkload / avgHeartRate, 4);
}

/** Percentage drift between two half-EFs. */
export function decouplingPercent(firstHalfEfficiency: number, secondHalfEfficiency: number): number | null {
  if (!finite(firstHalfEfficiency) || firstHalfEfficiency <= 0) return null;
  if (!finite(secondHalfEfficiency) || secondHalfEfficiency <= 0) return null;
  return round(((firstHalfEfficiency - secondHalfEfficiency) / firstHalfEfficiency) * 100, 2);
}

export interface DecouplingOptions {
  /** Session duration; drives the 45-minute meaningfulness gate. */
  durationSeconds: number;
  /** Cycling uses Pw:Hr, everything else Pa:Hr. */
  sport?: string | null;
  warmupSeconds?: number;
  minDurationMinutes?: number;
  thresholdPct?: number;
  /** Used for the whole-session EF when the stream has no HR. */
  avgHrFallback?: number | null;
}

/** True when the sport's workload channel is power rather than speed. */
export function isPowerSport(sport?: string | null): boolean {
  const s = (sport || '').toLowerCase();
  return s.startsWith('cyc') || s.includes('bike') || s.startsWith('row');
}

/**
 * Split a steady session into comparable halves and compute EF + drift.
 * Warm-up is excluded; both halves must carry HR readings.
 */
export function computeAerobicDecoupling(
  samples: DecouplingSample[] | null | undefined,
  options: DecouplingOptions,
): DecouplingResult {
  const metric: DecouplingMetric = isPowerSport(options.sport) ? 'Pw:Hr' : 'Pa:Hr';
  const empty: DecouplingResult = {
    metric,
    efficiency_factor: null,
    first_half_efficiency: null,
    second_half_efficiency: null,
    first_half_hr: null,
    second_half_hr: null,
    decoupling_pct: null,
    flag: null,
    evaluated: false,
  };

  const warmup = options.warmupSeconds ?? DECOUPLING_WARMUP_SECONDS;
  const minDuration = (options.minDurationMinutes ?? DECOUPLING_MIN_DURATION_MINUTES) * 60;
  const threshold = options.thresholdPct ?? ELEVATED_DECOUPLING_THRESHOLD_PCT;

  const all = (samples || []).filter(
    (s) => finite(s.time) && finite(s.value) && s.value > 0 && finite(s.heartRate) && (s.heartRate as number) > 0,
  );
  if (all.length === 0) return empty;

  const overallEf = efficiencyFactor(
    mean(all.map((s) => s.value)) ?? 0,
    mean(all.map((s) => s.heartRate as number)) ?? options.avgHrFallback ?? 0,
  );

  const duration = options.durationSeconds || all[all.length - 1].time - all[0].time;
  if (duration < minDuration) {
    return { ...empty, efficiency_factor: overallEf };
  }

  const steady = all.filter((s) => s.time > warmup).sort((a, b) => a.time - b.time);
  const midpoint = Math.floor(steady.length / 2);
  const firstHalf = steady.slice(0, midpoint);
  const secondHalf = steady.slice(midpoint);
  if (firstHalf.length < DECOUPLING_MIN_SAMPLES_PER_HALF || secondHalf.length < DECOUPLING_MIN_SAMPLES_PER_HALF) {
    return { ...empty, efficiency_factor: overallEf };
  }

  const firstHr = mean(firstHalf.map((s) => s.heartRate as number));
  const secondHr = mean(secondHalf.map((s) => s.heartRate as number));
  const firstEf = efficiencyFactor(mean(firstHalf.map((s) => s.value)) ?? 0, firstHr ?? 0);
  const secondEf = efficiencyFactor(mean(secondHalf.map((s) => s.value)) ?? 0, secondHr ?? 0);
  const drift = firstEf !== null && secondEf !== null ? decouplingPercent(firstEf, secondEf) : null;

  return {
    metric,
    efficiency_factor: overallEf,
    first_half_efficiency: firstEf,
    second_half_efficiency: secondEf,
    first_half_hr: firstHr === null ? null : round(firstHr, 1),
    second_half_hr: secondHr === null ? null : round(secondHr, 1),
    decoupling_pct: drift,
    flag: drift !== null && drift > threshold ? ELEVATED_AEROBIC_DECOUPLING : null,
    evaluated: drift !== null,
  };
}