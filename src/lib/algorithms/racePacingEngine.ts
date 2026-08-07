// src/lib/algorithms/racePacingEngine.ts
// Race pacing & strategy engine: Minetti grade-adjusted pace (GAP), heat/humidity
// pace adjustment, and a glycogen-aware split-execution strategy. Pure functions —
// no React, no I/O — so the same module can drive the on-screen splits, the race
// strategy builder, and any backend side calculation.

export type SplitPhase = 'start' | 'steady' | 'finish';

export interface RacePaceInput {
  /** Flat-equivalent target pace, seconds per km. */
  flatPaceSecPerKm: number;
  /** Current segment grade as a fraction (e.g. 0.05 = +5%, -0.08 = -8%). */
  grade: number;
  /** Fraction of total race distance completed, 0..1. */
  distanceFraction: number;
  /** Air temperature in °F (convert from °C via cToF if needed). */
  airTempF: number;
  /** Dew point in °F. */
  dewPointF: number;
}

export interface SplitPoint {
  distanceFraction: number;
  phase: SplitPhase;
  /** Target pace for this split, seconds per km (GAP × heat × glycogen throttle). */
  targetPaceSecPerKm: number;
  /** Same as mm:ss /km string for display. */
  targetPaceLabel: string;
}

// --- Minetti energy cost -----------------------------------------------------
// Minetti et al. energy cost of running C(g) in J/(kg·m) as a function of grade g.
// C(g) = 155.4g^5 − 30.4g^4 − 43.3g^3 + 46.3g^2 + 19.5g + 3.6
// Downhill cost benefit is clamped at −12% grade: beyond that, eccentric braking
// forces dominate and going steeper no longer makes the athlete faster.
export function minettiCost(g: number): number {
  const g2 = g * g;
  const g3 = g2 * g;
  const g4 = g3 * g;
  const g5 = g4 * g;
  return 155.4 * g5 - 30.4 * g4 - 43.3 * g3 + 46.3 * g2 + 19.5 * g + 3.6;
}

const FLAT_COST = minettiCost(0); // 3.6 J/(kg·m)

// GAP multiplier (pace factor relative to flat): >1 means slower (uphill or
// steep-downhill-braking), <1 means faster (shallow downhill).
export function gradeAdjustedPaceFactor(grade: number): number {
  const g = Math.max(grade, -0.12); // eccentric braking clamp
  return minettiCost(g) / FLAT_COST;
}

// Apply the grade factor to a flat pace (sec/km) → grade-adjusted pace (sec/km).
export function gradeAdjustedPace(flatPaceSecPerKm: number, grade: number): number {
  return flatPaceSecPerKm * gradeAdjustedPaceFactor(grade);
}

// --- Heat / humidity adjustment ---------------------------------------------
// Heat Score = Air Temp °F + Dew Point °F. Returns a pace multiplier (1 + penalty).
//   < 110        → 0% adjustment
//   111 – 130    → +0.5% to +2.0%
//   131 – 150    → +2.0% to +4.5%
//   151 – 170    → +4.5% to +8.0%
//   > 170        → +8.0%+ (danger)
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

export function heatScore(airTempF: number, dewPointF: number): number {
  if (!Number.isFinite(airTempF) || !Number.isFinite(dewPointF)) return 0;
  return airTempF + dewPointF;
}

export function heatAdjustmentFactor(airTempF: number, dewPointF: number): number {
  const score = heatScore(airTempF, dewPointF);
  if (!Number.isFinite(score) || score <= 110) return 1.0;
  if (score <= 130) return 1.0 + lerp(0.005, 0.020, (score - 110) / 20);
  if (score <= 150) return 1.0 + lerp(0.020, 0.045, (score - 130) / 20);
  if (score <= 170) return 1.0 + lerp(0.045, 0.080, (score - 150) / 20);
  // Beyond 170 the penalty keeps growing ~2% per 30 score; flag as dangerous.
  return 1.0 + 0.080 + ((score - 170) / 30) * 0.02;
}

export function heatIsDangerous(airTempF: number, dewPointF: number): boolean {
  return heatScore(airTempF, dewPointF) > 170;
}

// --- Glycogen / split-execution strategy ------------------------------------
// 0–15% distance:  1.5% conservative throttle below GAP target (protect early glycogen)
// 15–85% distance: steady-state effort matched to terrain GAP
// 85–100% distance: uncapped effort (kick)
export function glycogenSplitPhase(distanceFraction: number): SplitPhase {
  if (distanceFraction < 0.15) return 'start';
  if (distanceFraction < 0.85) return 'steady';
  return 'finish';
}

// Pace multiplier per phase: start = slower (1.015×), steady = even (1.0), finish = faster (0.985×).
export function glycogenThrottleFactor(distanceFraction: number): number {
  const phase = glycogenSplitPhase(distanceFraction);
  if (phase === 'start') return 1.015;
  if (phase === 'steady') return 1.0;
  return 0.985;
}

// --- Combined target pace for a single split --------------------------------
export function targetPaceForSplit(input: RacePaceInput): number {
  const gap = gradeAdjustedPace(input.flatPaceSecPerKm, input.grade);
  const heat = heatAdjustmentFactor(input.airTempF, input.dewPointF);
  const throttle = glycogenThrottleFactor(input.distanceFraction);
  return gap * heat * throttle;
}

// --- Build a full split plan across a race ----------------------------------
export interface SplitPlanOptions {
  flatPaceSecPerKm: number;
  /** Grade per segment, parallel to nothing — a single constant grade, or pass per
   *  segment via buildRaceSplits's segmentGrades array. */
  grade?: number;
  airTempF: number;
  dewPointF: number;
  /** Number of splits to generate (e.g. km markers). */
  splits?: number;
}

export function buildRaceSplits(opts: SplitPlanOptions): SplitPoint[] {
  const { flatPaceSecPerKm, airTempF, dewPointF } = opts;
  const grade = opts.grade ?? 0;
  const count = Math.max(1, Math.floor(opts.splits ?? 10));
  const points: SplitPoint[] = [];
  for (let i = 0; i < count; i++) {
    // distanceFraction at the midpoint of split i of `count`.
    const frac = (i + 0.5) / count;
    const pace = targetPaceForSplit({ flatPaceSecPerKm, grade, distanceFraction: frac, airTempF, dewPointF });
    points.push({
      distanceFraction: frac,
      phase: glycogenSplitPhase(frac),
      targetPaceSecPerKm: Math.round(pace * 100) / 100,
      targetPaceLabel: formatPace(pace),
    });
  }
  return points;
}

// --- Formatting helpers -----------------------------------------------------
export function cToF(c: number): number {
  return (c * 9) / 5 + 32;
}

export function formatPace(secPerKm: number): string {
  if (!Number.isFinite(secPerKm) || secPerKm <= 0) return '—';
  const s = Math.round(secPerKm);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r < 10 ? '0' : ''}${r}`;
}