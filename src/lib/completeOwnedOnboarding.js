import { findOwnedOnboardingProfile } from './ownedOnboardingProfile';

// All reads and writes are scoped to the authenticated account. An unexpected
// query result is an ownership error, never permission to link a foreign row.
export async function completeOwnedOnboarding({ userId, listProfiles, createProfile, linkProfile, payload }) {
  if (typeof userId !== 'string' || !userId.trim()) throw new Error('Sign in again before creating your profile.');
  const rows = await listProfiles(userId);
  if (!Array.isArray(rows)) throw new Error('Could not verify your existing profiles. Please retry.');
  if (rows.some(row => !row || row.created_by_id !== userId || typeof row.id !== 'string' || !row.id.trim())) {
    throw new Error('Could not verify profile ownership. No profile was linked.');
  }
  const owned = findOwnedOnboardingProfile(rows, userId);
  if (owned) {
    await linkProfile(owned.id);
    return { profile: owned, mode: 'relink' };
  }
  const created = await createProfile(payload);
  if (!created || typeof created.id !== 'string' || !created.id.trim()) {
    throw new Error('Profile creation was not confirmed. Please retry; we will check for an existing profile.');
  }
  // Never trust the create response alone. Verify ownership via a new scoped read.
  const after = await listProfiles(userId);
  if (!Array.isArray(after)) throw new Error('Profile created, but ownership could not be verified. Retry to reconnect.');
  const verified = findOwnedOnboardingProfile(after, userId);
  if (!verified || verified.id !== created.id) {
    throw new Error('Profile created, but ownership could not be verified. Retry to reconnect.');
  }
  await linkProfile(verified.id);
  return { profile: verified, mode: 'new' };
}
