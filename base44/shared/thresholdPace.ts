// base44/shared/thresholdPace.ts
// Backend-authoritative running threshold-pace derivation — port of
// src/science/thresholdPace.ts. Reconciles the Daniels T-pace (anchored to
// VDOT) against recent actual threshold-intensity runs, gated by Lactate
// Threshold HR when available, with explicit provenance so a stale stored
// value is never silently trusted. Used by the AI plan/strategy functions to
// compute the athlete's current threshold pace server-side.
//
// Sources:
//   Daniels, J. 2013. Daniels' Running Formula (T-pace ≈ 88% VO2max).
//   Lucia et al. 2000. Lactate-threshold HR anchoring for intensity gating.
//
// Requires ≥18 min sustained effort to qualify a run as threshold-intensity;
// implausibly fast "runs" (>10 km faster than 2:30/km) are rejected as
// mislabeled cycling. With <3 qualifying runs the Daniels T-pace dominates.

import { danielsThresholdMs } from './vdot.ts';

const WINDOW_DAYS = 42;
const MIN_THR_DUR_S = 18 * 60;
const FASTEST_K = 8;
const HR_BAND = 0.08;
const PACE_BAND = 0.12;
const MAX_SANE_PACE_MS = 1000 / 150; // 2:30/km

function isRun(sport) { return !!sport && sport.toLowerCase().startsWith('run'); }
function isCrossTrain(sport) {
  if (!sport) return false;
  const s = sport.toLowerCase();
  return s.startsWith('cyc') || s.startsWith('swim') || s.startsWith('strength') || s.startsWith('triathlon') || s.startsWith('other');
}
function dayAge(dateStr) {
  if (!dateStr) return Infinity;
  const t = Date.parse(dateStr);
  if (Number.isNaN(t)) return Infinity;
  return (Date.now() - t) / 86400000;
}
function sessionPaceMs(s) {
  const durS = s.duration_seconds ?? (s.duration_minutes ? s.duration_minutes * 60 : 0);
  const distKm = s.distance_km;
  if (!durS || durS <= 0 || !distKm || distKm <= 0) return null;
  return (distKm * 1000) / durS;
}

export function deriveRunningThresholdPace(sessions, vdot, storedFtpMs, lactateThresholdHr) {
  const baseline = danielsThresholdMs(vdot);
  const recent = (sessions || []).filter((s) => dayAge(s.date) <= WINDOW_DAYS);
  const runs = recent.filter((s) => isRun(s.sport));
  const observed = runs
    .map((s) => {
      const durS = s.duration_seconds ?? (s.duration_minutes ? s.duration_minutes * 60 : 0);
      const pace = sessionPaceMs(s);
      const age = dayAge(s.date);
      if (!pace || durS < MIN_THR_DUR_S) return null;
      if ((s.distance_km ?? 0) > 10 && pace > MAX_SANE_PACE_MS) return null;
      let intensityOk = false;
      if (lactateThresholdHr && s.avg_hr) intensityOk = Math.abs(s.avg_hr - lactateThresholdHr) / lactateThresholdHr <= HR_BAND;
      else if (baseline) intensityOk = pace >= baseline * (1 - PACE_BAND) && pace <= baseline * (1 + PACE_BAND);
      else intensityOk = true;
      return intensityOk ? { pace, age } : null;
    })
    .filter(Boolean);

  const crossTrainCount = recent.filter((s) => isCrossTrain(s.sport)).length;

  let observedMs = null;
  if (observed.length) {
    const top = [...observed].sort((a, b) => b.pace - a.pace).slice(0, FASTEST_K);
    let wsum = 0, psum = 0;
    for (const o of top) { const w = Math.exp(-o.age / 30); wsum += w; psum += w * o.pace; }
    observedMs = wsum > 0 ? psum / wsum : null;
  }

  let paceMs = null, source = '';
  if (observedMs != null && baseline != null) {
    if (observed.length >= 3) { paceMs = 0.65 * observedMs + 0.35 * baseline; source = `From ${observed.length} recent runs`; }
    else if (observed.length === 2) { paceMs = 0.5 * observedMs + 0.5 * baseline; source = 'From 2 recent runs'; }
    else { paceMs = 0.35 * observedMs + 0.65 * baseline; source = 'From 1 recent run'; }
  } else if (baseline != null) {
    paceMs = baseline; source = crossTrainCount > 0 ? 'VDOT only — cross-training in progress' : 'VDOT Daniels T-pace';
  } else if (storedFtpMs && storedFtpMs > 0) {
    paceMs = storedFtpMs; source = 'Stored baseline';
  } else {
    paceMs = null; source = 'Set VDOT or a baseline';
  }
  return { paceMs, source, observedRunCount: observed.length, recentCrossTrainCount: crossTrainCount };
}