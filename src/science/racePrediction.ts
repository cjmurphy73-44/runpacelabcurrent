// src/science/racePrediction.ts
// Race-time prediction with confidence bands — the "you're on track for X"
// panel. Reuses the Daniels equivalent-time engine and adds form (TSB) plus
// data-confidence adjustments so the prediction is honest about its uncertainty.
//
// Sources:
//  - Daniels, J. 2013. Daniels' Running Formula (VDOT ↔ race-time equivalence).
//  - Coggan, A. 2003. PMC — TSB as a form modifier near race day.
//
// Confidence model (advisory, transparent):
//  - Base confidence from number-of-qualifying-observations (recent runs):
//      n=0 → 0.55, n=1 → 0.70, n=2 → 0.80, n>=3 → 0.88, n>=6 → 0.93
//  - Reduced when TSB is very negative (over-trained → under-perform) OR very
//    positive (detrained / taper-sharp). A neutral +5 to +15 TSB band is
//    treated as peak-ready; we widen the band symmetrically otherwise.
//  - The band is ±confidence-pct of the predicted time, displayed explicitly.
//
// Limitations:
//  - A single VDOT can't capture event specificity (a 5K VDOT may over-predict
//    a marathon without long-run volume context).
//  - Weather, course, and tactics are not modeled here (see racePacing.ts).

import { solveEquivalentTime, calculateVDOT } from './vdot';

export interface RacePredictionInput {
  /** Recent performance — either a known VDOT or a (time, distance) result. */
  vdot?: number | null;
  raceTimeSeconds?: number;
  raceDistanceMeters?: number;
  /** Training Stress Balance on prediction day. */
  tsb?: number | null;
  /** Number of qualifying recent runs (from thresholdPace derivation). */
  qualifyingRunCount?: number;
}

export interface PredictedDistance {
  distanceMeters: number;
  label: string;
  seconds: number;
  formatted: string;
  bandSeconds: { low: number; high: number };
  bandFormatted: { low: string; high: string };
}

export interface RacePredictionResult {
  vdot: number | null;
  confidence: number; // 0..1
  predictions: PredictedDistance[];
  note: string;
}

const DISTANCES = [
  { meters: 5000, label: '5K' },
  { meters: 10000, label: '10K' },
  { meters: 21097.5, label: 'Half Marathon' },
  { meters: 42195, label: 'Marathon' },
];

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.round(totalSeconds % 60);
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

function baseConfidence(n: number): number {
  if (n <= 0) return 0.55;
  if (n === 1) return 0.7;
  if (n === 2) return 0.8;
  if (n <= 5) return 0.88;
  return 0.93;
}

/** Widen the band when TSB is outside the peak-ready (+5..+15) zone. */
function tsbBandWiden(tsb: number | null | undefined): number {
  if (tsb == null || !Number.isFinite(tsb)) return 0.08;
  if (tsb >= 5 && tsb <= 15) return 0.04; // peak-ready — tighten band
  const dist = Math.min(Math.abs(tsb - 10), 40); // distance from sweet spot, capped
  return 0.04 + (dist / 40) * 0.1; // up to +10% extra spread
}

export function predictRaceTimes(input: RacePredictionInput): RacePredictionResult {
  let vdot = input.vdot ?? null;
  if ((vdot == null || vdot <= 0) && input.raceTimeSeconds && input.raceDistanceMeters) {
    try {
      vdot = calculateVDOT(input.raceTimeSeconds, input.raceDistanceMeters);
    } catch {
      vdot = null;
    }
  }
  if (vdot == null || vdot <= 0) {
    return { vdot: null, confidence: 0, predictions: [], note: 'Add a recent race result or VDOT to predict race times.' };
  }

  const conf = baseConfidence(input.qualifyingRunCount ?? 0);
  const widen = tsbBandWiden(input.tsb);
  const oneMinusConf = Math.max(1 - conf, widen); // band half-width as a fraction

  const predictions: PredictedDistance[] = DISTANCES.map((d) => {
    const seconds = solveEquivalentTime(vdot as number, d.meters);
    const low = Math.round(seconds * (1 - oneMinusConf));
    const high = Math.round(seconds * (1 + oneMinusConf));
    return {
      distanceMeters: d.meters,
      label: d.label,
      seconds,
      formatted: formatDuration(seconds),
      bandSeconds: { low, high },
      bandFormatted: { low: formatDuration(low), high: formatDuration(high) },
    };
  });

  const note = input.qualifyingRunCount && input.qualifyingRunCount >= 3
    ? 'Grounded in recent threshold-intensity runs.'
    : 'Based on a single result — prediction band is wide until more runs land.';

  return { vdot, confidence: conf, predictions, note };
}