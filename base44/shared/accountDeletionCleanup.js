/** Run every entity cleanup and retain only entity labels for safe diagnostics. */
export async function runAccountEntityCleanup(cleanup) {
  const failedEntities = [];
  for (const [entityName, remove] of cleanup) {
    try {
      await remove();
    } catch {
      failedEntities.push(entityName);
    }
  }
  return failedEntities;
}

/**
 * The account identity must survive any incomplete cleanup so the caller can
 * authenticate and retry. Never call deleteUser when an entity step failed.
 */
export async function finalizeAccountDeletion(cleanup, deleteUser) {
  // Deleting the owned AthleteProfile early can make a partial retry
  // impossible: its athlete_id is needed to identify service-created rows.
  // Keep profiles until every other entity cleanup has completed successfully.
  const profileSteps = cleanup.filter(([name]) => name === 'AthleteProfile');
  const dependentSteps = cleanup.filter(([name]) => name !== 'AthleteProfile');
  const failedEntities = await runAccountEntityCleanup(dependentSteps);
  if (failedEntities.length) return { success: false, failedEntities };
  const profileFailures = await runAccountEntityCleanup(profileSteps);
  if (profileFailures.length) return { success: false, failedEntities: profileFailures };
  await deleteUser();
  return { success: true, failedEntities: [] };
}

/**
 * Resolve athlete IDs only from profiles owned by this authenticated user.
 * Linked IDs alone are not deletion authority: they may be stale or point to
 * another athlete. Fail closed for inconsistent account linkage.
 */
export function resolveOwnedAthleteIds(user, profiles) {
  if (!user?.id || !Array.isArray(profiles)) throw new Error('Cannot verify profile ownership');
  const ids = [];
  for (const profile of profiles) {
    if (!profile?.id || profile.created_by_id !== user.id) {
      throw new Error('Cannot verify profile ownership');
    }
    if (!ids.includes(profile.id)) ids.push(profile.id);
  }
  const linkedId = user.data?.athlete_profile_id || user.athlete_profile_id;
  if (linkedId && !ids.includes(linkedId)) {
    throw new Error('Account profile linkage requires review');
  }
  return ids;
}

/** Generate athlete-ID-scoped cleanup for service-created records. */
export function linkedAthleteCleanup(entities, athleteIds) {
  const entityNames = [
    'WorkoutSession', 'WorkoutAsset', 'DailyMetrics',
    'TrainingPlan', 'TrainingPlanSession', 'CoachMessage',
    'WorkoutFeedback', 'GarminConnection', 'StravaConnection',
    'CorosConnection', 'WearableConnection', 'LabResult', 'WebhookEvent',
  ];
  return athleteIds.flatMap((athleteId) =>
    entityNames.map((name) => [
      name + 'ByAthlete',
      () => entities[name].deleteMany({ athlete_id: athleteId }),
    ])
  );
}
