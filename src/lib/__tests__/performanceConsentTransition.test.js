import { describe, expect, it } from 'vitest';
import { reviewConsentTransition as review } from '../../../base44/shared/performanceConsentTransition.js';

const now = Date.parse('2026-11-18T06:00:00Z');
const athlete = { id: 'ath-1', created_by_id: 'user-1' };
const authenticatedUser = { id: 'user-1' };
const issue = {
  action: 'issue', grant_id: 'grant-1', event_id: 'event-1', revision: 1,
  athlete_id: 'ath-1', athlete_user_id: 'user-1', source_provider: 'coros',
  provider_activity_id: '2:run-123', scope: 'running_performance_recalibration',
  occurred_at: '2026-11-17T02:00:00Z', expires_at: '2026-11-19T02:00:00Z',
};
const revoke = {
  ...issue, action: 'revoke', event_id: 'event-2', revision: 2,
  occurred_at: '2026-11-17T04:00:00Z',
};
const input = (overrides = {}) =>
  ({ athlete, authenticatedUser, event: issue, previous: null, now, ...overrides });

describe('synthetic-only performance consent issuance/revocation journal', () => {
  it('reviews initial issuance but cannot authorize or verify it', () => {
    expect(review(input())).toEqual({
      review_ready: true, consent_verified: false, may_recalibrate: false,
      reason: 'requires_atomic_server_journal_commit',
    });
  });

  it('rejects duplicate grant issuance and replayed event IDs', () => {
    expect(review(input({ previous: issue })).reason).toBe('replayed_or_out_of_order_event');
    expect(review(input({ previous: issue, event: { ...revoke, event_id: issue.event_id } }))
      .reason).toBe('replayed_or_out_of_order_event');
  });

  it('rejects sequence skipping and time reversal', () => {
    expect(review(input({ previous: issue, event: { ...revoke, revision: 4 } }))
      .reason).toBe('replayed_or_out_of_order_event');
    expect(review(input({ previous: issue, event: { ...revoke, occurred_at: issue.occurred_at } }))
      .reason).toBe('non_monotonic_event_time');
  });

  it('reviews revocation only as a terminal transition and never authorizes writes', () => {
    expect(review(input({ previous: issue, event: revoke }))).toMatchObject({
      review_ready: true, consent_verified: false, may_recalibrate: false,
    });
    expect(review(input({ previous: revoke, event: {
      ...issue, action: 'issue', revision: 3, event_id: 'event-3',
      occurred_at: '2026-11-17T05:00:00Z',
    } })).reason).toBe('revocation_is_terminal');
  });

  it('rejects cross-athlete grants and spoofed user-link permissions', () => {
    expect(review(input({ authenticatedUser: {
      id: 'coach-1', athlete_profile_id: 'ath-1', coached_athletes: ['ath-1'], role: 'admin',
    } })).reason).toBe('owner_not_verified');
    expect(review(input({ event: { ...issue, athlete_id: 'ath-2' } })).reason)
      .toBe('event_scope_mismatch');
  });

  it.each(['garmin','strava'])('rejects mismatched %s provider identity', (source_provider) => {
    expect(review(input({ previous: issue, event: { ...revoke, source_provider } }))
      .reason).toBe('grant_identity_mismatch');
  });

  it('rejects expired or future-dated issuance', () => {
    expect(review(input({ event: { ...issue, expires_at: '2026-11-18T05:00:00Z' } }))
      .reason).toBe('expired_or_invalid_issue');
    expect(review(input({ event: { ...issue, occurred_at: '2026-11-19T05:00:00Z' } }))
      .reason).toBe('invalid_event_time');
  });

  it('does not trust client-provided server or consent verification flags', () => {
    expect(review(input({ event: { ...issue, server_verified: true,
      verified: true, consent_verified: true, may_recalibrate: true } }))).toMatchObject({
      review_ready: true, consent_verified: false, may_recalibrate: false,
    });
  });
});
