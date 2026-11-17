// Never infer creator ownership from the first result of a readable profile query.
// A coach/admin-readable or malformed profile is not proof of ownership.
export function resolveOnboardingOwnedProfile(records, userId) {
  if (typeof userId !== 'string' || !userId.trim() || !Array.isArray(records)) {
    return { status: 'unverified', profile: null };
  }
  if (records.some((p) => !p || typeof p !== 'object' || typeof p.id !== 'string' || !p.id.trim()
    || typeof p.created_by_id !== 'string' || !p.created_by_id.trim())) {
    return { status: 'unverified', profile: null };
  }
  // Do not trust mixed visibility results to decide whether a profile should be created.
  if (records.some((p) => p.created_by_id !== userId)) {
    return { status: 'unverified', profile: null };
  }
  if (records.length === 0) return { status: 'missing', profile: null };
  if (records.length !== 1) return { status: 'ambiguous', profile: null };
  return { status: 'owned', profile: records[0] };
}
