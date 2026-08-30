// src/science/thresholdPace.ts
// Multi-sport-aware running threshold-pace derivation — reconciles the Daniels
// T-pace (anchored to VDOT) against recent ACTUAL threshold-intensity runs, gated
// by LTHR when available, with explicit provenance ("VDOT only — cross-training
// in progress") so a stale stored value is never silently trusted.
//
// Sources:
//  - Daniels, J. 2013. Daniels' Running Formula (T-pace ≈ 88% VO2max).
//  - Lucia et al. 2000. Lactate-threshold HR anchoring for intensity gating.
//  - Empirical recency-weighted blend of qualifying runs (this implementation).
//
// Limitations:
//  - Requires ≥18 min sustained effort to qualify a run as threshold-intensity.
//  - Implausibly fast "runs" (faster than 2:30/km over >10 km) are rejected as
//    mislabeled cycling.
//  - With <3 qualifying runs the Daniels T-pace dominates; the blend weights
//    reverse only at ≥3 observations.

import { getTrainingPaces } from './vdot';

export interface ThresholdPaceResult {
  paceMs: number | null;
  source: string;
  observedRunCount: number;
  recentCrossTrainCount: number;
}

const WINDOW_DAYS = 42;
const MIN_THR_DUR_S = 18 * 60;
const FASTEST_K = 8;
const HR_BAND = 0.08;
const PACE_BAND = 0.12;
const MAX_SANE_PACE_MS = 1000 / 150; // 2:30/km

function isRun(sport?: string): boolean {
  return !!sport && sport.toLowerCase().startsWith('run');
}
function isCrossTrain(sport?: string): boolean {
  if (!sport) return false;
  const s = sport.toLowerCase();
  return s.startsWith('cyc') || s.startsWith('swim') || s.startsWith('strength') || s.startsWith('triathlon') || s.startsWith('other');
}
function dayAge(dateStr?: string): number {
  if (!dateStr) return Infinity;
  const t = Date.parse(dateStr);
  if (Number.isNaN(t)) return Infinity;
  return (Date.now() - t) / 86_400_000;
}

function sessionPaceMs(s: any): number | null {
  const durS = s.duration_seconds ?? (s.duration_minutes ? s.duration_minutes * 60 : 0);
  const distKm = s.distance_km;
  if (!durS || durS <= 0 || !distKm || distKm <= 0) return null;
  return (distKm * 1000) / durS;
}

export function deriveRunningThresholdPace(
  sessions: any[],
  vdot?: number | null,
  storedFtpMs?: number | null,
  lactateThresholdHr?: number | null,
): ThresholdPaceResult {
  const baseline = (function danielsThresholdMs(v: number | null | undefined): number | null {
    if (!v || v <= 0) return null;
    try {
      const secPerKm = getTrainingPaces(v).threshold.secPerKm;
      return secPerKm > 0 ? 1000 / secPerKm : null;
    } catch {
      return null;
    }
  })(vdot);

  const recent = (sessions || []).filter((s) => dayAge(s.date) <= WINDOW_DAYS);
  const runs = recent.filter((s) => isRun(s.sport));
  const observed = runs
    .map((s: any) => {
      const durS = s.duration_seconds ?? (s.duration_minutes ? s.duration_minutes * 60 : 0);
      const pace = sessionPaceMs(s);
      const age = dayAge(s.date);
      if (!pace || durS < MIN_THR_DUR_S) return null;
      if ((s.distance_km ?? 0) > 10 && pace > MAX_SANE_PACE_MS) return null;
      let intensityOk = false;
      if (lactateThresholdHr && s.avg_hr) {
        intensityOk = Math.abs(s.avg_hr - lactateThresholdHr) / lactateThresholdHr <= HR_BAND;
      } else if (baseline) {
        intensityOk = pace >= baseline * (1 - PACE_BAND) && pace <= baseline * (1 + PACE_BAND);
      } else {
        intensityOk = true;
      }
      return intensityOk ? { pace, age } : null;
    })
    .filter(Boolean) as { pace: number; age: number }[];

  const crossTrainCount = recent.filter((s) => isCrossTrain(s.sport)).length;

  let observedMs: number | null = null;
  if (observed.length) {
    const top = [...observed].sort((a, b) => b.pace - a.pace).slice(0, FASTEST_K);
    let wsum = 0, psum = 0;
    for (const o of top) {
      const w = Math.exp(-o.age / 30);
      wsum += w;
      psum += w * o.pace;
    }
    observedMs = wsum > 0 ? psum / wsum : null;
  }

  let paceMs: number | null = null;
  let source = '';
  if (observedMs != null && baseline != null) {
    if (observed.length >= 3) { paceMs = 0.65 * observedMs + 0.35 * baseline; source = `From ${observed.length} recent runs`; }
    else if (observed.length === 2) { paceMs = 0.5 * observedMs + 0.5 * baseline; source = 'From 2 recent runs'; }
    else { paceMs = 0.35 * observedMs + 0.65 * baseline; source = 'From 1 recent run'; }
  } else if (baseline != null) {
    paceMs = baseline;
    source = crossTrainCount > 0 ? 'VDOT only — cross-training in progress' : 'VDOT Daniels T-pace';
  } else if (storedFtpMs && storedFtpMs > 0) {
    paceMs = storedFtpMs; source = 'Stored baseline';
  } else {
    paceMs = null; source = 'Set VDOT or a baseline';
  }
  return { paceMs, source, observedRunCount: observed.length, recentCrossTrainCount: crossTrainCount };
}