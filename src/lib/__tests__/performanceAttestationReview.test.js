import { describe, expect, it } from 'vitest';
import { assessRunningPerformanceCandidate } from '../../../base44/shared/runningPerformanceCandidate.js';
import { reviewPerformanceAttestation } from '../../../base44/shared/performanceAttestationReview.js';

const now = Date.parse('2026-11-18T00:00:00Z');
const athlete = { id: 'ath-1', created_by_id: 'owner-1' };
const authenticatedUser = { id: 'owner-1' };
const candidate = assessRunningPerformanceCandidate({
  sport: 'running', source_provider: 'coros', provider_activity_id: '2:12345',
  claimed_effort: 'race', distance_m: 5000, elapsed_seconds: 1200,
});
const sourceEvidence = {
  athlete_id: 'ath-1', source_provider: 'coros', provider_activity_id: '2:12345',
  sport: 'running', review_state: 'independently_confirmed',
};
const consentGrant = {
  athlete_id: 'ath-1', athlete_user_id: 'owner-1',
  source_provider: 'coros', provider_activity_id: '2:12345',
  scope: 'running_performance_recalibration', state: 'active',
  granted_at: '2026-11-17T00:00:00Z', expires_at: '2026-11-19T00:00:00Z',
};
const data = (overrides = {}) => ({
  candidate, athlete, authenticatedUser, sourceEvidence, consentGrant, now,
  ...overrides,
});

describe('offline review of service-origin performance attestation prerequisites', () => {
  it('never authorizes a VDOT/threshold write even for matching synthetic evidence', () => {
    expect(reviewPerformanceAttestation(data())).toEqual({
      review_ready: true, performance_verified: false, consent_verified: false,
      may_recalibrate: false,
      reason: 'requires_authenticated_server_origin_and_runtime_authorization',
    });
  });

  it('denies cross-user athlete ownership and user-field link self-grants', () => {
    const result = reviewPerformanceAttestation(data({
      authenticatedUser: { id: 'coach-1', athlete_profile_id: 'ath-1',
        coached_athletes: ['ath-1'], role: 'admin' },
    }));
    expect(result.reason).toBe('athlete_ownership_unproven');
    expect(result.may_recalibrate).toBe(false);
  });

  it.each(['garmin', 'strava'])('rejects %s mismatched provider activity identity', (source_provider) => {
    expect(reviewPerformanceAttestation(data({
      sourceEvidence: { ...sourceEvidence, source_provider },
    })).reason).toBe('source_attestation_missing_or_mismatched');
  });

  it('rejects consent for a different activity even when the athlete matches', () => {
    expect(reviewPerformanceAttestation(data({
      consentGrant: { ...consentGrant, provider_activity_id: 'different' },
    })).reason).toBe('scoped_athlete_consent_missing_or_revoked');
  });

  it('rejects revoked and expired grants', () => {
    expect(reviewPerformanceAttestation(data({
      consentGrant: { ...consentGrant, revoked_at: '2026-11-17T12:00:00Z' },
    })).reason).toBe('scoped_athlete_consent_missing_or_revoked');
    expect(reviewPerformanceAttestation(data({
      consentGrant: { ...consentGrant, expires_at: '2026-11-17T23:59:00Z' },
    })).reason).toBe('consent_expired_or_invalid');
  });

  it('rejects synthetic consent that lacks specific recalibration scope', () => {
    expect(reviewPerformanceAttestation(data({
      consentGrant: { ...consentGrant, scope: 'read_workouts' },
    })).reason).toBe('scoped_athlete_consent_missing_or_revoked');
  });

  it('rejects imported race titles, provider verification and forged consent flags', () => {
    expect(reviewPerformanceAttestation(data({
      candidate: { ...candidate, performance_verified: true,
        consent: true, server_issued: true, event_name: 'Official Race' },
    })).reason).toBe('candidate_not_qualified');
  });

  it('rejects race-like cycling or unqualified comeback workouts', () => {
    const bike = assessRunningPerformanceCandidate({
      sport: 'cycling', source_provider: 'coros', provider_activity_id: '2:12345',
      claimed_effort: 'race', distance_m: 5000, elapsed_seconds: 1200,
    });
    expect(reviewPerformanceAttestation(data({ candidate: bike })).reason)
      .toBe('candidate_not_qualified');
  });

  it('requires valid timestamps and fails closed when now is unknown', () => {
    expect(reviewPerformanceAttestation(data({ now: undefined })).reason)
      .toBe('consent_expired_or_invalid');
    expect(reviewPerformanceAttestation(data({
      consentGrant: { ...consentGrant, granted_at: '2026-11-19T00:01:00Z' },
    })).reason).toBe('consent_expired_or_invalid');
  });
});
