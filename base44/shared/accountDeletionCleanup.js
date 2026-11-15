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

/**
 * Persist the deletion scope before removing its AthleteProfile rows.
 * Only the trusted service-role AccountDeletionRecovery entity may back retries.
 * A missing or ambiguous record must never authorize destructive cleanup.
 */
export async function loadOrCreateDeletionRecovery(entities, user) {
  if (!user?.id) throw new Error('Deletion requires an authenticated user');
  const existing = await entities.AccountDeletionRecovery.filter({ user_id: user.id });
  if (!Array.isArray(existing) || existing.length > 1) {
    throw new Error('Deletion recovery scope requires manual review');
  }
  if (existing.length === 1) {
    const record = existing[0];
    if (record?.user_id !== user.id || record.state !== 'prepared' ||
        !Array.isArray(record.athlete_ids) ||
        !record.athlete_ids.every((id) => typeof id === 'string' && id.length > 0) ||
        new Set(record.athlete_ids).size !== record.athlete_ids.length) {
      throw new Error('Deletion recovery scope requires manual review');
    }
    // On retries, the User still exists even if AthleteProfile rows were
    // removed. Do not accept a journal that omits the user's linked profile
    // or any surviving owned profile. A partial-profile deletion is allowed.
    const linkedId = user.data?.athlete_profile_id || user.athlete_profile_id;
    if (linkedId && !record.athlete_ids.includes(linkedId)) {
      throw new Error('Deletion recovery scope requires manual review');
    }
    const survivingProfiles = await entities.AthleteProfile.filter({ created_by_id: user.id });
    if (!Array.isArray(survivingProfiles) ||
        survivingProfiles.some((profile) =>
          !profile?.id || profile.created_by_id !== user.id ||
          !record.athlete_ids.includes(profile.id))) {
      throw new Error('Deletion recovery scope requires manual review');
    }
    return record;
  }

  const ownedProfiles = await entities.AthleteProfile.filter({ created_by_id: user.id });
  const athleteIds = resolveOwnedAthleteIds(user, ownedProfiles);
  const created = await entities.AccountDeletionRecovery.create({
    user_id: user.id,
    athlete_ids: athleteIds,
    state: 'prepared',
  });
  if (!created?.id || created.user_id !== user.id ||
      created.state !== 'prepared' ||
      JSON.stringify(created.athlete_ids) !== JSON.stringify(athleteIds)) {
    throw new Error('Deletion recovery record could not be verified');
  }
  return created;
}

/**
 * A post-create/read consistency check. This detects duplicate or replaced
 * journals before destructive cleanup, but is NOT an atomic lock or unique
 * constraint. Platform-level serialization remains a release prerequisite.
 */
export async function verifyDeletionRecoveryScope(entities, userId, expected) {
  if (!userId || !expected?.id || expected.user_id !== userId ||
      expected.state !== 'prepared' || !Array.isArray(expected.athlete_ids)) {
    throw new Error('Deletion recovery scope requires manual review');
  }
  const records = await entities.AccountDeletionRecovery.filter({ user_id: userId });
  if (!Array.isArray(records) || records.length !== 1) {
    throw new Error('Deletion recovery scope requires manual review');
  }
  const actual = records[0];
  if (!actual || actual.id !== expected.id || actual.user_id !== userId ||
      actual.state !== 'prepared' || !Array.isArray(actual.athlete_ids) ||
      actual.athlete_ids.length !== expected.athlete_ids.length ||
      actual.athlete_ids.some((id, index) => id !== expected.athlete_ids[index]) ||
      new Set(actual.athlete_ids).size !== actual.athlete_ids.length) {
    throw new Error('Deletion recovery scope requires manual review');
  }
  return actual;
}

/**
 * Read-only, privacy-minimizing operator triage of a deletion journal.
 * This deliberately cannot authorize or execute deletion, and does not
 * return stored user IDs or athlete IDs to a caller.
 *
 * userExists must be established by an independently authorized lookup.
 * A missing or indeterminate lookup never allows journal purging.
 */
export function classifyDeletionRecoveryForReview(record, userExists) {
  if (!record?.id || !record.user_id || record.state !== 'prepared' ||
      !Array.isArray(record.athlete_ids) ||
      !record.athlete_ids.every((id) => typeof id === 'string' && id.length > 0) ||
      new Set(record.athlete_ids).size !== record.athlete_ids.length ||
      typeof userExists !== 'boolean') {
    return { status: 'manual_review', safe_to_purge: false };
  }
  if (userExists) {
    return { status: 'account_exists_retry_or_investigate', safe_to_purge: false };
  }
  // Identity may be gone but athlete rows, uploads and third-party copies may
  // remain. Never classify a missing user as proof of complete deletion.
  return { status: 'orphaned_journal_investigate', safe_to_purge: false };
}
