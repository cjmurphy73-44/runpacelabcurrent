/**
 * Proposed input contract for server-side review of running performance evidence.
 *
 * This validator does NOT authenticate a provider response, verify athlete
 * consent, authorize a user, or certify a performance. Treat all input as
 * untrusted, including fields named "verified" or "consent". Return only a
 * review candidate. The separate service-side attestation/consent workflow
 * does not yet exist, so callers must not translate this into a VDOT update.
 */
const PROVIDERS = new Set(['garmin', 'coros', 'strava']);
const EFFORTS = new Set(['race', 'threshold_test']);

export function assessRunningPerformanceCandidate(input) {
  const reject = (reason) => ({
    review_eligible: false, performance_verified: false,
    may_recalibrate: false, reason,
  });
  if (!input || typeof input !== 'object' || Array.isArray(input)) return reject('invalid_input');
  if (input.sport !== 'running') return reject('not_running');
  if (!PROVIDERS.has(input.source_provider)) return reject('unknown_provider');
  if (typeof input.provider_activity_id !== 'string' ||
      !input.provider_activity_id.trim() || input.provider_activity_id.length > 200) {
    return reject('missing_provider_identity');
  }
  if (!EFFORTS.has(input.claimed_effort)) return reject('no_declared_test_or_race');
  const dist = input.distance_m;
  const seconds = input.elapsed_seconds;
  if (typeof dist !== 'number' || !Number.isFinite(dist) || dist < 1200 ||
      typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < 180) {
    return reject('invalid_performance_measurement');
  }
  // A claimed "running" sport can conceal a ride or corrupt distance/time.
  // This bound is only a sanity check, never sport or maximal-effort proof.
  const speed = dist / seconds;
  if (speed > 1000 / 150 || speed < 1000 / 1800) return reject('implausible_running_speed');
  // Never accept consent flags, provider descriptions, event names or
  // asserted server verification from this untrusted object as authority.
  return {
    review_eligible: true,
    performance_verified: false,
    may_recalibrate: false,
    reason: 'requires_independent_server_attestation_and_athlete_consent',
    source_provider: input.source_provider,
    provider_activity_id: input.provider_activity_id,
    claimed_effort: input.claimed_effort,
  };
}
