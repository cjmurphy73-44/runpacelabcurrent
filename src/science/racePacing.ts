// src/science/racePacing.ts
// Race split-execution strategy: grade-adjusted pace (Minetti), heat/humidity
// adjustment, and a glycogen-aware phase throttle. Pure functions.
//
// Sources:
//  - Minetti et al. 2002. Energy cost of running C(g) (see grade.ts).
//  - Heat-stress pacing bands (environment.ts).
//  - Glycogen-conservation pacing practice (conservative start, steady mid,
//    uncapped finish) — standard endurance racing strategy.
//
// Limitations:
//  - Single-grade-per-split model; real courses vary per km (feed per-segment
//    grades in the caller to model rolling terrain).
//  - Glycogen throttle is heuristic, not a metabolic model.

import { gradeAdjustedPace } from './grade';
import { heatAdjustmentFactor, heatIsDangerous, heatScore, cToF } from './environment';

export type SplitPhase = 'start' | 'steady' | 'finish';

export interface RacePaceInput {
  flatPaceSecPerKm: number;
  grade: number;
  distanceFraction: number;
  airTempF: number;
  dewPointF: number;
}

export interface SplitPoint {
  distanceFraction: number;
  phase: SplitPhase;
  targetPaceSecPerKm: number;
  targetPaceLabel: string;
}

// 0–15%: +1.5% (protect early glycogen); 15–85%: even; 85–100%: −1.5% (kick).
export function glycogenSplitPhase(distanceFraction: number): SplitPhase {
  if (distanceFraction < 0.15) return 'start';
  if (distanceFraction < 0.85) return 'steady';
  return 'finish';
}

export function glycogenThrottleFactor(distanceFraction: number): number {
  const phase = glycogenSplitPhase(distanceFraction);
  if (phase === 'start') return 1.015;
  if (phase === 'steady') return 1.0;
  return 0.985;
}

export function targetPaceForSplit(input: RacePaceInput): number {
  const gap = gradeAdjustedPace(input.flatPaceSecPerKm, input.grade);
  const heat = heatAdjustmentFactor(input.airTempF, input.dewPointF);
  const throttle = glycogenThrottleFactor(input.distanceFraction);
  return gap * heat * throttle;
}

export function formatSplitPace(secPerKm: number): string {
  if (!Number.isFinite(secPerKm) || secPerKm <= 0) return '—';
  const s = Math.round(secPerKm);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r < 10 ? '0' : ''}${r}`;
}

export interface SplitPlanOptions {
  flatPaceSecPerKm: number;
  grade?: number;
  airTempF: number;
  dewPointF: number;
  splits?: number;
}

export function buildRaceSplits(opts: SplitPlanOptions): SplitPoint[] {
  const { flatPaceSecPerKm, airTempF, dewPointF } = opts;
  const grade = opts.grade ?? 0;
  const count = Math.max(1, Math.floor(opts.splits ?? 10));
  const points: SplitPoint[] = [];
  for (let i = 0; i < count; i++) {
    const frac = (i + 0.5) / count;
    const pace = targetPaceForSplit({ flatPaceSecPerKm, grade, distanceFraction: frac, airTempF, dewPointF });
    points.push({
      distanceFraction: frac,
      phase: glycogenSplitPhase(frac),
      targetPaceSecPerKm: Math.round(pace * 100) / 100,
      targetPaceLabel: formatSplitPace(pace),
    });
  }
  return points;
}