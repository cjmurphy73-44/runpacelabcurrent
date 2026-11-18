/**
 * Offline specification of a future server-owned performance attestation check.
 * All arguments are synthetic snapshots until an authenticated, isolated Base44
 * service proves their source, tenant isolation and immutable provenance.
 *
 * No caller, provider, or client flag can turn this into permission to mutate
 * AthleteProfile. Always return may_recalibrate:false. No SDK calls or writes.
 */
export function reviewPerformanceAttestation({
  candidate, athlete, authenticatedUser, sourceEvidence, consentGrant, now,
} = {}) {
  const deny = (reason) => ({
    review_ready: false, performance_verified: false,
    consent_verified: false, may_recalibrate: false, reason,
  });
  if (!athlete?.id || !authenticatedUser?.id ||
      !athlete.created_by_id || athlete.created_by_id !== authenticatedUser.id) {
    return deny('athlete_ownership_unproven');
  }
  if (!candidate?.review_eligible ||
      candidate.performance_verified !== false ||
      candidate.may_recalibrate !== false ||
      !candidate.source_provider || !candidate.provider_activity_id) {
    return deny('candidate_not_qualified');
  }
  if (!sourceEvidence || sourceEvidence.athlete_id !== athlete.id ||
      sourceEvidence.source_provider !== candidate.source_provider ||
      sourceEvidence.provider_activity_id !== candidate.provider_activity_id ||
      sourceEvidence.sport !== 'running' ||
      sourceEvidence.review_state !== 'independently_confirmed') {
    return deny('source_attestation_missing_or_mismatched');
  }
  // A UI toggle or imported workout note is never a grant. Future backend
  // must prove who issued the consent record and protect it from user updates.
  if (!consentGrant || consentGrant.athlete_id !== athlete.id ||
      consentGrant.athlete_user_id !== authenticatedUser.id ||
      consentGrant.source_provider !== candidate.source_provider ||
      consentGrant.provider_activity_id !== candidate.provider_activity_id ||
      consentGrant.scope !== 'running_performance_recalibration' ||
      consentGrant.state !== 'active' || !consentGrant.granted_at ||
      consentGrant.revoked_at) {
    return deny('scoped_athlete_consent_missing_or_revoked');
  }
  const currentTime = typeof now === 'number' && Number.isFinite(now) ? now : NaN;
  const issuedTime = Date.parse(consentGrant.granted_at);
  const expiryTime = Date.parse(consentGrant.expires_at);
  if (!Number.isFinite(currentTime) || !Number.isFinite(issuedTime) ||
      !Number.isFinite(expiryTime) || issuedTime > currentTime ||
      expiryTime <= currentTime || expiryTime <= issuedTime) {
    return deny('consent_expired_or_invalid');
  }
  // Passing a shape check is not authentication or authorization. The
  // independent durable source, consent signature, replay protections and
  // isolated platform permissions remain unverified.
  return {
    review_ready: true, performance_verified: false,
    consent_verified: false, may_recalibrate: false,
    reason: 'requires_authenticated_server_origin_and_runtime_authorization',
  };
}
