// base44/functions/physiologyCompute/entry.ts
//
// S6 crown-jewel IP protection: server-authoritative physiology compute.
//
// Wraps the proprietary shared science modules (base44/shared/readiness.ts,
// vdot.ts, thresholdPace.ts) behind an authenticated backend function so the
// formulas never ship to the browser bundle. The frontend calls this function
// via the SDK and renders the returned values; client-side copies in src/science/
// remain only as instant-display fallbacks while the server result loads.
//
// Computes:
//   - holistic readiness score + components (HRV/sleep/RHR/TSB blended against
//     a 14-day rolling baseline)
//   - VDOT estimate from the athlete's strongest recent qualifying race
//   - Daniels training paces (E/M/T/I/R) from VDOT
//   - running threshold pace reconciled from recent threshold-intensity runs
//
// Authenticated (requires a logged-in user); scoped to the caller's own athlete
// profile via getOwnedAthlete so one user can't compute against another's data.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { computeHolisticReadiness, computeBaseline } from '../../shared/readiness.ts';
import { calculateVDOT, getTrainingPaces, getEquivalentTimes, danielsThresholdMs, formatPaceFromMs } from '../../shared/vdot.ts';
import { deriveRunningThresholdPace } from '../../shared/thresholdPace.ts';

const RACE_DISTANCES_M = {
  fiveKm: 5000,
  tenKm: 10000,
  halfMarathon: 21097.5,
  marathon: 42195,
};

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const athlete = await getOwnedAthlete(base44, user.id);
    if (!athlete) return Response.json({ error: 'No athlete profile found' }, { status: 404 });

    // Pull recent daily metrics (14 days) for readiness baseline + today's signals.
    const metrics = await base44.asServiceRole.entities.DailyMetrics
      .filter({ athlete_id: athlete.id }, '-date', 14)
      .catch(() => []);

    const today = metrics[0] || null;
    const readiness = computeReadiness(today, metrics);

    // Pull recent workout sessions (42 days) for VDOT + threshold pace.
    const sessions = await base44.asServiceRole.entities.WorkoutSession
      .filter({ athlete_id: athlete.id }, '-date', 200)
      .catch(() => []);

    const vdotResult = computeVdotFromSessions(sessions, athlete);
    const thresholdPace = deriveRunningThresholdPace(
      sessions,
      vdotResult.vdot ?? athlete.vdot_estimate ?? null,
      athlete.functional_threshold_pace_ms ?? null,
      athlete.lactate_threshold_hr ?? null,
    );

    const vdot = vdotResult.vdot ?? athlete.vdot_estimate ?? null;
    let trainingPaces = null;
    let equivalentTimes = null;
    if (vdot && vdot > 0) {
      try { trainingPaces = getTrainingPaces(vdot); } catch { /* invalid vdot */ }
      try { equivalentTimes = getEquivalentTimes(vdot); } catch { /* invalid vdot */ }
    }

    return Response.json({
      readiness,
      vdot: vdot ?? null,
      vdot_source: vdotResult.source,
      training_paces: trainingPaces,
      equivalent_times: equivalentTimes,
      threshold_pace: thresholdPace.paceMs ? {
        pace_ms: thresholdPace.paceMs,
        formatted: formatPaceFromMs(thresholdPace.paceMs),
        source: thresholdPace.source,
        observed_run_count: thresholdPace.observedRunCount,
      } : null,
      computed_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('physiologyCompute', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// Resolve the athlete profile owned by the caller. Admins still need a profile
// of their own to compute against — this is a personal compute, not admin-wide.
async function getOwnedAthlete(base44, userId) {
  const profiles = await base44.asServiceRole.entities.AthleteProfile
    .filter({ created_by_id: userId }, '-created_date', 1)
    .catch(() => []);
  return profiles[0] || null;
}

// Holistic readiness from today's signals + 14-day rolling baseline.
function computeReadiness(today, history) {
  if (!today && (!history || history.length === 0)) {
    return { score: null, status: 'Insufficient Data', components: null, details: null };
  }
  const hrvBase = computeBaseline(history, 'hrv', 14);
  const rhrBase = computeBaseline(history, 'resting_hr', 14);
  const sleepBase = computeBaseline(history, 'sleep_score', 14);
  const sleepDurBase = computeBaseline(history, 'sleep_duration_hours', 14);

  const signals = today ? {
    hrv: today.hrv ?? null,
    sleep_score: today.sleep_score ?? null,
    sleep_duration_hours: today.sleep_duration_hours ?? null,
    resting_hr: today.resting_hr ?? null,
    body_battery: today.body_battery ?? null,
    stress_score: today.stress_score ?? null,
    tsb: today.calculated_tsb ?? null,
  } : {};

  const baseline = {
    hrv: hrvBase,
    resting_hr: rhrBase,
    sleep_score: sleepBase,
    sleep_duration_hours: sleepDurBase,
  };

  const score = computeHolisticReadiness(signals, baseline);
  let status = 'Moderate';
  if (score >= 85) status = 'Optimal';
  else if (score >= 70) status = 'Good';
  else if (score >= 50) status = 'Moderate';
  else status = 'High Fatigue';

  return { score, status, baseline };
}

// Find the strongest recent qualifying race effort and compute VDOT from it.
// Falls back to the stored vdot_estimate if no qualifying session exists.
function computeVdotFromSessions(sessions, athlete) {
  const recent = (sessions || []).filter((s) => {
    if (!s.date) return false;
    const ageDays = (Date.now() - Date.parse(s.date)) / 86400000;
    return ageDays <= 180; // last ~6 months
  });

  let bestVdot = null;
  let sourceSession = null;

  for (const s of recent) {
    const durS = s.duration_seconds ?? (s.duration_minutes ? s.duration_minutes * 60 : 0);
    const distM = s.distance_km ? s.distance_km * 1000 : 0;
    if (!durS || durS < 180 || distM < 1200) continue; // Daniels requires >= 3 min, >= 1200 m
    try {
      const vdot = calculateVDOT(durS, distM);
      if (vdot > 0 && (bestVdot == null || vdot > bestVdot)) {
        bestVdot = vdot;
        sourceSession = s;
      }
    } catch { /* session doesn't qualify */ }
  }

  if (bestVdot != null) {
    return { vdot: bestVdot, source: `From ${sourceSession?.date || 'recent race'}` };
  }
  return { vdot: null, source: athlete.vdot_estimate ? 'Stored VDOT' : 'No qualifying race yet' };
}