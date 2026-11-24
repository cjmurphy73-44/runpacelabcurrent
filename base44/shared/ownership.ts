// base44/shared/ownership.ts
// Shared ownership guard used by authed HTTP wrappers (recalculateCTLATLTSB,
// postWorkoutAIEvaluation, and the new Core-migration functions). Caller owns the
// athlete if AthleteProfile.created_by_id === user.id OR user.role === 'admin'.

export async function assertOwnsAthlete(base44: any, user: any, athlete_id: string): Promise<boolean> {
  if (!user) return false;
  if (user.role === 'admin') return true;
  const athlete = await base44.entities.AthleteProfile.get(athlete_id).catch(() => null);
  return !!athlete && athlete.created_by_id === user.id;
}

export function isRecordId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);
}

export async function getOwnedAthlete(base44: any, userId: string) {
  if (!userId) return null;
  const entities = base44.asServiceRole.entities;
  const user = await entities.User.get(userId).catch(() => null);
  const verifiedId = user?.data?.verified_athlete_profile_id ?? user?.verified_athlete_profile_id;
  if (isRecordId(verifiedId)) {
    const profile = await entities.AthleteProfile.get(verifiedId).catch(() => null);
    if (profile && (profile.created_by_id === userId || user?.role === 'admin')) return profile;
  }
  const profiles = await entities.AthleteProfile.filter({ created_by_id: userId }, '-updated_date', 1);
  return profiles.find((profile: any) => profile.created_by_id === userId) ?? null;
}

// Only persisted ownership and reviewed assignments grant access. RLS cache
// fields on User and legacy coach-created roster rows are not proof of consent.
export async function getAuthorizedAthlete(base44: any, user: any, athleteId: unknown) {
  if (!user?.id || !isRecordId(athleteId)) return null;
  const entities = base44.asServiceRole.entities;
  const athlete = await entities.AthleteProfile.get(athleteId).catch(() => null);
  if (!athlete || athlete.id !== athleteId) return null;
  if (athlete.created_by_id === user.id || user.role === 'admin') return athlete;
  const assignments = await entities.CoachAthleteAssignment.filter({
    coach_user_id: user.id,
    athlete_profile_id: athleteId,
    status: 'active',
    authorization_source: 'admin_reviewed',
  }, 'id', 1);
  return assignments.some((row: any) => row.coach_user_id === user.id &&
    row.athlete_profile_id === athleteId && row.status === 'active' &&
    row.authorization_source === 'admin_reviewed') ? athlete : null;
}
