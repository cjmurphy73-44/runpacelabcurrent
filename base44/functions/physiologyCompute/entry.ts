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
import { usableStoredVdot } from '../../shared/vdotEvidence.ts';
import { bestAttestedRaceResult } from '../../shared/raceResultContract.ts';

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

    // Only creator-owned, explicitly athlete-attested race records are eligible.
    // Imported WorkoutSession flags cannot silently assert race provenance.
    const raceResults = await base44.asServiceRole.entities.RaceResult
      .filter({ athlete_id: athlete.id, created_by_id: user.id }, '-race_date', 200);
    const bestRace = bestAttestedRaceResult(raceResults);
    const vdotResult = bestRace ? {
      vdot: bestRace.vdot,
      source: 'Athlete-reported race result (not independently verified)',
      source_session_id: null,
      source_date: bestRace.record.race_date,
      source_sport: 'running',
    } : { vdot: null, source: 'No qualifying athlete-reported race result', source_session_id: null, source_date: null, source_sport: null };
    const thresholdPace = deriveRunningThresholdPace(
      sessions,
      vdotResult.vdot ?? usableStoredVdot(athlete.vdot_estimate),
      athlete.functional_threshold_pace_ms ?? null,
      athlete.lactate_threshold_hr ?? null,
    );

    const vdot = vdotResult.vdot ?? usableStoredVdot(athlete.vdot_estimate);
    let trainingPaces = null;
    let equivalentTimes = null;
    if (vdot && vdot > 0) {
      try { trainingPaces = getTrainingPaces(vdot); } catch { /* invalid vdot */ }
      try { equivalentTimes = getEquivalentTimes(vdot); } catch { /* invalid vdot */ }
    }

    return Response.json({
      readiness,
      vdot: vdot ?? null,
      vdot_source: vdotResult.vdot != null ? vdotResult.source : (vdot != null ? 'Stored athlete estimate, provenance unverified' : 'No qualifying race performance'),
      vdot_source_session_id: vdotResult.source_session_id ?? null,
      vdot_source_date: vdotResult.source_date ?? null,
      vdot_source_sport: vdotResult.source_sport ?? null,
      vdot_evidence_status: bestRace ? 'self_reported' : (vdot != null ? 'unverified_legacy' : 'missing'),
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

  // Insufficient data: the engine had no valid signals to compute from.
  // Return an explicit null score so the UI shows insufficient-data rather
  // than a number derived purely from defaults.
  if (score == null) {
    return {
      score: null,
      status: 'Insufficient Data',
      baseline,
      signal_count: 0,
      has_baseline: hrvBase != null || rhrBase != null || sleepBase != null,
    };
  }

  // Count how many signals actually contributed (not defaults).
  const signalCount = [
    signals.hrv, signals.sleep_score, signals.sleep_duration_hours,
    signals.resting_hr, signals.body_battery, signals.stress_score, signals.tsb,
  ].filter((v) => v != null && Number.isFinite(v)).length;

  const hasBaseline = hrvBase != null || rhrBase != null || sleepBase != null;

  let status = 'Moderate';
  if (score >= 85) status = 'Optimal';
  else if (score >= 70) status = 'Good';
  else if (score >= 50) status = 'Moderate';
  else status = 'High Fatigue';

  return { score, status, baseline, signal_count: signalCount, has_baseline: hasBaseline };
}

