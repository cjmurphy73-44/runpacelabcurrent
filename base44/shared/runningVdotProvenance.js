/**
 * Fail-closed VDOT provenance for the current WorkoutSession contract.
 *
 * Garmin/COROS/Strava sport and distance summaries are not authenticated
 * evidence of a maximal running performance. No trusted race/test attestation
 * is declared on WorkoutSession. Thus ordinary workouts must never replace
 * an athlete's historical VDOT until a separately verified consented
 * performance-attestation contract is designed and staging-tested.
 *
 * The session array is accepted for future integration but cannot authorize
 * a performance recalibration based solely on its current fields.
 */
export function resolveVdotReference(_sessions, athlete = {}) {
  const stored = Number(athlete?.vdot_estimate);
  const hasStored = Number.isFinite(stored) && stored > 0;
  return {
    vdot: null,
    source: hasStored
      ? 'Stored historical VDOT — current running performance unverified'
      : 'No verified running performance available',
    source_session_id: null,
    source_date: null,
    source_sport: null,
    performance_verified: false,
    qualification_reason: 'no_server_attested_running_performance',
  };
}
