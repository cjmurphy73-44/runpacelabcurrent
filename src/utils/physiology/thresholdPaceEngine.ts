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
const MIN_THR_DUR_S = 18 * 60;  // ~threshold-effort duration band (18–90 min)
const MAX_THR_DUR_S = 90 * 60;
const BAND = 0.15;               // accept runs whose pace is within ±15% of Daniels T-pace

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
): ThresholdPaceResult {
  const baseline = danielsThresholdMs(vdot);
  const recent = (sessions || []).filter((s: any) => dayAge(s.date) <= WINDOW_DAYS);

  const runs = recent.filter((s: any) => isRun(s.sport));
  const observed = runs
    .map((s: any) => {
      const durS = s.duration_seconds ?? (s.duration_minutes ? s.duration_minutes * 60 : 0);
      const pace = sessionPaceMs(s);
      const age = dayAge(s.date);
      let valid = false;
      if (baseline && durS >= MIN_THR_DUR_S && durS <= MAX_THR_DUR_S && pace) {
        // Keep runs whose pace sits in the threshold band around the Daniels value.
        if (pace >= baseline * (1 - BAND) && pace <= baseline * (1 + BAND)) valid = true;
      }
      return valid ? { pace, age } : null;
    })
    .filter(Boolean) as { pace: number; age: number }[];

  const crossTrainCount = recent.filter((s: any) => isCrossTrain(s.sport)).length;

  // Recency-weighted mean of the up-to-5 fastest valid threshold-ish runs.
  let observedMs: number | null = null;
  if (observed.length) {
    const top = [...observed].sort((a, b) => b.pace - a.pace).slice(0, 5);
    let wsum = 0;
    let psum = 0;
    for (const o of top) {
      const w = Math.exp(-o.age / 30); // recent runs count more
      wsum += w;
      psum += w * o.pace;
    }
    observedMs = wsum > 0 ? psum / wsum : null;
  }

  // Blend: empirical runs increasingly override the Daniels baseline as more arrive.
  let paceMs: number | null = null;
  let source = '';
  if (observedMs != null && baseline != null) {
    if (observed.length >= 3) {
      paceMs = 0.6 * observedMs + 0.4 * baseline;
      source = `From ${observed.length} recent runs`;
    } else {
      paceMs = 0.4 * observedMs + 0.6 * baseline;
      source = `From ${observed.length} recent run${observed.length === 1 ? '' : 's'}`;
    }
  } else if (baseline != null) {
    // No recent runs to verify against — be honest about why.
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