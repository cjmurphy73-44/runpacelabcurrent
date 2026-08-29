// src/utils/physiology/thresholdPaceEngine.ts
// Multi-sport-aware running threshold-pace derivation.
//
// Takes the Daniels T-pace anchored to the athlete's VDOT and reconciles it
// against recent ACTUAL runs (empirical), while accounting for cross-training
// (rides / swims / strength / other) so an injured or cross-training athlete
// gets an honest "VDOT only — cross-training in progress" verdict instead of
// trusting a stale, possibly-wrong stored value.
//
// Returns the running threshold pace in m/s plus a human-readable source label.

import { getTrainingPaces } from '@/math/vdot';

export interface ThresholdPaceResult {
  paceMs: number | null;        // running threshold pace in m/s
  source: string;               // provenance shown as the tile sub-label
  observedRunCount: number;     // recent runs close enough to T-pace to count
  recentCrossTrainCount: number; // recent rides/swims/other sessions in the window
}

const WINDOW_DAYS = 42;
const MIN_THR_DUR_S = 18 * 60;  // sustained-effort floor — short jogs excluded
const FASTEST_K = 8;             // recency-weighted mean of the fastest K qualifying runs
const HR_BAND = 0.08;            // a run counts as threshold-intensity if avg HR is within ±8% of LTHR
const PACE_BAND = 0.12;          // (no LTHR) fallback gate around the Daniels T-pace
const MAX_SANE_PACE_MS = 1000 / 150; // 2:30/km — anything faster over >10km is mislabeled cycling

function isRun(sport?: string): boolean {
  return !!sport && sport.toLowerCase().startsWith('run');
}
function isCrossTrain(sport?: string): boolean {
  if (!sport) return false;
  const s = sport.toLowerCase();
  return (
    s.startsWith('cyc') ||
    s.startsWith('swim') ||
    s.startsWith('strength') ||
    s.startsWith('triathlon') ||
    s.startsWith('other')
  );
}
function dayAge(dateStr?: string): number {
  if (!dateStr) return Infinity;
  const t = Date.parse(dateStr);
  if (Number.isNaN(t)) return Infinity;
  return (Date.now() - t) / 86_400_000;
}

/** Daniels running threshold pace (m/s) from VDOT via the vdot engine. */
function danielsThresholdMs(vdot: number | null | undefined): number | null {
  if (!vdot || vdot <= 0) return null;
  try {
    const secPerKm = getTrainingPaces(vdot).threshold.secPerKm;
    return secPerKm > 0 ? 1000 / secPerKm : null;
  } catch {
    return null;
  }
}

function sessionPaceMs(s: any): number | null {
  const durS = s.duration_seconds ?? (s.duration_minutes ? s.duration_minutes * 60 : 0);
  const distKm = s.distance_km;
  if (!durS || durS <= 0 || !distKm || distKm <= 0) return null;
  return (distKm * 1000) / durS; // m/s
}

export function deriveRunningThresholdPace(
  sessions: any[],
  vdot?: number | null,
  storedFtpMs?: number | null,
  lactateThresholdHr?: number | null,
): ThresholdPaceResult {
  const baseline = danielsThresholdMs(vdot);
  const recent = (sessions || []).filter((s: any) => dayAge(s.date) <= WINDOW_DAYS);

  const runs = recent.filter((s: any) => isRun(s.sport));
  // Empirical anchor: consider EVERY recent run, but only keep the ones that were
  // actually a threshold-intensity effort — avg HR near lactate-threshold HR when
  // available, else pace within the Daniels T-pace band. Easy jogs and short
  // outings do NOT anchor a threshold pace; they're not threshold efforts. Also
  // apply the running-plausibility guard to drop impossible paces (cycling data
  // mislabeled as a run, e.g. 2:30/km over 10km).
  const observed = runs
    .map((s: any) => {
      const durS = s.duration_seconds ?? (s.duration_minutes ? s.duration_minutes * 60 : 0);
      const pace = sessionPaceMs(s);
      const age = dayAge(s.date);
      if (!pace || durS < MIN_THR_DUR_S) return null;
      if ((s.distance_km ?? 0) > 10 && pace > MAX_SANE_PACE_MS) return null; // implausible run
      let intensityOk = false;
      if (lactateThresholdHr && s.avg_hr) {
        // Gate by actual intensity: near-threshold HR runs.
        intensityOk = Math.abs(s.avg_hr - lactateThresholdHr) / lactateThresholdHr <= HR_BAND;
      } else if (baseline) {
        // No LTHR — gate by pace proximity to the Daniels T-pace.
        intensityOk = pace >= baseline * (1 - PACE_BAND) && pace <= baseline * (1 + PACE_BAND);
      } else {
        intensityOk = true; // nothing to gate on — last resort
      }
      return intensityOk ? { pace, age } : null;
    })
    .filter(Boolean) as { pace: number; age: number }[];

  const crossTrainCount = recent.filter((s: any) => isCrossTrain(s.sport)).length;

  // Recency-weighted mean of the fastest qualifying runs (threshold ≈ best sustained effort).
  let observedMs: number | null = null;
  if (observed.length) {
    const top = [...observed].sort((a, b) => b.pace - a.pace).slice(0, FASTEST_K);
    let wsum = 0;
    let psum = 0;
    for (const o of top) {
      const w = Math.exp(-o.age / 30); // recent runs count more
      wsum += w;
      psum += w * o.pace;
    }
    observedMs = wsum > 0 ? psum / wsum : null;
  }

  // Blend: the more threshold-intensity runs we have, the more the empirical
  // value dominates over the (possibly stale) Daniels T-pace.
  let paceMs: number | null = null;
  let source = '';
  if (observedMs != null && baseline != null) {
    if (observed.length >= 3) {
      paceMs = 0.65 * observedMs + 0.35 * baseline;
      source = `From ${observed.length} recent runs`;
    } else if (observed.length === 2) {
      paceMs = 0.5 * observedMs + 0.5 * baseline;
      source = `From 2 recent runs`;
    } else {
      paceMs = 0.35 * observedMs + 0.65 * baseline;
      source = `From 1 recent run`;
    }
  } else if (baseline != null) {
    // No threshold-intensity runs to verify against — be honest about why.
    paceMs = baseline;
    source = crossTrainCount > 0
      ? 'VDOT only — cross-training in progress'
      : 'VDOT Daniels T-pace';
  } else if (storedFtpMs && storedFtpMs > 0) {
    paceMs = storedFtpMs;
    source = 'Stored baseline';
  } else {
    paceMs = null;
    source = 'Set VDOT or a baseline';
  }

  return { paceMs, source, observedRunCount: observed.length, recentCrossTrainCount: crossTrainCount };
}