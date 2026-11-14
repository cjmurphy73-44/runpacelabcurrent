// Explicit evidence-based gate for RaceResult writes.
// A runtime flag cannot substitute for proof of an atomic unique constraint or CAS.
export const RACE_RESULT_MUTATIONS_ENABLED = false;

export function assessRaceResultMutationCapability(capabilities) {
  const blockers = [];
  if (capabilities?.authenticatedOwnerVerified !== true) blockers.push('owner_unverified');
  if (capabilities?.directClientWritesDenied !== true) blockers.push('direct_write_rls_unverified');
  if (capabilities?.serviceRoleOwnerStampVerified !== true) blockers.push('service_role_owner_stamp_unverified');
  if (capabilities?.atomicUniqueRaceIdentityVerified !== true) blockers.push('atomic_unique_race_identity_unverified');
  if (capabilities?.atomicCorrectionCasVerified !== true) blockers.push('atomic_correction_cas_unverified');
  if (capabilities?.stagingIsolated !== true) blockers.push('staging_isolation_unverified');
  return { allowed: RACE_RESULT_MUTATIONS_ENABLED && blockers.length === 0, blockers };
}
