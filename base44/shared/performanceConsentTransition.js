/**
 * Pure, synthetic-only consent journal transition validator.
 *
 * This does NOT prove that the journal is durable, unique, ordered, signed,
 * tenant-isolated, server-issued or atomically committed. It NEVER authorizes
 * a recalibration. A real implementation needs platform-backed transactional
 * uniqueness and authenticated event origin before accepting any transition.
 */
export function reviewConsentTransition({ previous, event, athlete, authenticatedUser, now } = {}) {
  const result = (reason, review_ready = false) => ({
    review_ready, consent_verified: false, may_recalibrate: false, reason,
  });
  if (!athlete?.id || !authenticatedUser?.id ||
      !athlete.created_by_id || athlete.created_by_id !== authenticatedUser.id) {
    return result('owner_not_verified');
  }
  if (!event || typeof event !== 'object' || Array.isArray(event) ||
      !['issue', 'revoke'].includes(event.action) ||
      typeof event.event_id !== 'string' || !event.event_id.trim() ||
      event.event_id.length > 200 ||
      typeof event.grant_id !== 'string' || !event.grant_id.trim() ||
      event.grant_id.length > 200) return result('invalid_event');
  if (event.athlete_id !== athlete.id ||
      event.athlete_user_id !== authenticatedUser.id ||
      event.scope !== 'running_performance_recalibration' ||
      !['garmin', 'coros', 'strava'].includes(event.source_provider) ||
      typeof event.provider_activity_id !== 'string' ||
      !event.provider_activity_id.trim()) return result('event_scope_mismatch');
  const timestamp = Date.parse(event.occurred_at);
  if (!Number.isFinite(now) || !Number.isFinite(timestamp) ||
      timestamp > now || timestamp < 0) return result('invalid_event_time');

  if (!previous) {
    if (event.action !== 'issue' || event.revision !== 1 ||
        typeof event.expires_at !== 'string') return result('invalid_initial_issue');
    const expiration = Date.parse(event.expires_at);
    if (!Number.isFinite(expiration) || expiration <= timestamp ||
        expiration <= now) return result('expired_or_invalid_issue');
    return result('requires_atomic_server_journal_commit', true);
  }

  // Source snapshots are untrusted. This shape check cannot certify a prior
  // grant or establish the uniqueness of an event across concurrent requests.
  if (previous.grant_id !== event.grant_id ||
      previous.athlete_id !== event.athlete_id ||
      previous.athlete_user_id !== event.athlete_user_id ||
      previous.source_provider !== event.source_provider ||
      previous.provider_activity_id !== event.provider_activity_id ||
      previous.scope !== event.scope) return result('grant_identity_mismatch');
  if (!Number.isSafeInteger(previous.revision) ||
      event.revision !== previous.revision + 1 ||
      previous.event_id === event.event_id) return result('replayed_or_out_of_order_event');
  const prevTime = Date.parse(previous.occurred_at);
  if (!Number.isFinite(prevTime) || timestamp <= prevTime) return result('non_monotonic_event_time');
  if (previous.action === 'revoke') return result('revocation_is_terminal');
  if (previous.action !== 'issue' || event.action !== 'revoke') return result('unsupported_transition');
  return result('requires_atomic_server_journal_commit', true);
}
