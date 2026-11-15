// Never relink a profile solely because it was returned by a filtered SDK query.
// A backend query error or unexpectedly broad response must not cross-link users.
export function findOwnedOnboardingProfile(rows, userId) {
  if (typeof userId !== 'string' || !userId.trim() || !Array.isArray(rows)) return null;
  return rows.find((row) =>
    row && typeof row.id === 'string' && row.id.trim() &&
    row.created_by_id === userId) ?? null;
}
