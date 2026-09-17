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