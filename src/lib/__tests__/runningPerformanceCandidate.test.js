import { describe, expect, it } from 'vitest';
import { assessRunningPerformanceCandidate as assess } from '../../../base44/shared/runningPerformanceCandidate.js';
import { resolveVdotReference } from '../../../base44/shared/runningVdotProvenance.js';

const candidate = (changes = {}) => ({
  sport: 'running', source_provider: 'garmin', provider_activity_id: 'garmin:123',
  claimed_effort: 'race', distance_m: 5000, elapsed_seconds: 1200,
  ...changes,
});

describe('untrusted multisport performance candidate gate', () => {
  it.each(['garmin','coros','strava'])('accepts %s plausible race only for independent review', (provider) => {
    expect(assess(candidate({ source_provider: provider }))).toMatchObject({
      review_eligible: true, performance_verified: false, may_recalibrate: false,
      reason: 'requires_independent_server_attestation_and_athlete_consent',
    });
  });
  it('rejects cycling even with a claimed race and plausible running pace', () => {
    expect(assess(candidate({ sport: 'cycling' })).reason).toBe('not_running');
  });
  it('rejects ordinary return-from-injury and easy runs as performance candidates', () => {
    expect(assess(candidate({ claimed_effort: 'easy_run' })).reason).toBe('no_declared_test_or_race');
    expect(assess(candidate({ claimed_effort: undefined })).review_eligible).toBe(false);
  });
  it('rejects ride-like speed mislabeled as running', () => {
    expect(assess(candidate({ source_provider: 'coros', distance_m: 30000, elapsed_seconds: 3600 }))
      .reason).toBe('implausible_running_speed');
  });
  it('rejects missing provider identity and invalid performance values', () => {
    expect(assess(candidate({ provider_activity_id: '' })).reason).toBe('missing_provider_identity');
    expect(assess(candidate({ distance_m: Infinity })).reason).toBe('invalid_performance_measurement');
    expect(assess(candidate({ elapsed_seconds: 0 })).reason).toBe('invalid_performance_measurement');
  });
  it('rejects unsupported provider and ambiguous sporting types', () => {
    expect(assess(candidate({ source_provider: 'manual' })).reason).toBe('unknown_provider');
    expect(assess(candidate({ sport: 'triathlon' })).reason).toBe('not_running');
  });
  it('does not trust forged server-verification or consent flags in source metadata', () => {
    const forged = candidate({ source_provider: 'strava', verified: true,
      consent: true, issuer: 'server_verified', event_name: 'Official Race' });
    const review = assess(forged);
    expect(review.review_eligible).toBe(true);
    expect(review.performance_verified).toBe(false);
    expect(review.may_recalibrate).toBe(false);
    expect(resolveVdotReference([forged], { vdot_estimate: 54 }).vdot).toBeNull();
  });
});
