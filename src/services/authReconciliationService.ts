/**
 * AUTH RECONCILIATION SERVICE
 * 
 * Owns the account resolution & linking logic for OAuth and email-based authentication.
 * Decoupled from base44AuthService to:
 * 1. Handle case-insensitive email matching
 * 2. Link OAuth provider IDs to existing accounts
 * 3. Create accounts idempotently (upsert semantics)
 * 4. Resolve conflicts and half-authenticated states
 * 
 * Flow:
 * - User logs in via Google OAuth
 * - Base44 SDK returns the user identity
 * - THIS service reconciles the identity with app's user/athlete profile records
 * - If account exists (by normalized email), link the provider ID and return user
 * - If no account, create idempotently so retries don't fail
 */

import { base44 } from '@/api/base44Client';
import { base44AthleteProfileRepo } from '@/services/adapters/base44';

export interface OAuthProfile {
  email: string;
  name: string;
  providerId: string;
  provider: 'google' | 'apple' | 'github';
}

export interface UserAccount {
  id: string;
  email: string;
  name: string;
  provider_id?: string;
  provider?: string;
  created_at: string;
  updated_at: string;
}

export interface AthleteProfile {
  id: string;
  user_id?: string;
  created_by_id?: string;
  email?: string;
  name?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Normalize email for consistent lookups
 */
function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Find or reconcile a user account by OAuth profile.
 * 
 * Priority:
 * 1. If a user exists with provider_id, return it (already linked)
 * 2. If a user exists with the normalized email, link the provider_id and return it
 * 3. Otherwise, create a new user record
 */
export async function findOrCreateUserByOAuth(
  oauthProfile: OAuthProfile
): Promise<UserAccount> {
  const normalizedEmail = normalizeEmail(oauthProfile.email);

  try {
    // Check if base44.auth.me() already resolves an authenticated user
    // (Base44 SDK may have already created a session)
    const currentUser = await base44.auth?.me?.();
    if (currentUser && currentUser.id) {
      // User is already authenticated. Normalize and ensure email is set correctly.
      const user: UserAccount = {
        id: currentUser.id,
        email: normalizeEmail(currentUser.email || oauthProfile.email),
        name: currentUser.name || oauthProfile.name,
        provider_id: currentUser.provider_id || oauthProfile.providerId,
        provider: currentUser.provider || oauthProfile.provider,
        created_at: currentUser.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // If provider_id is missing, attempt to link it
      if (!currentUser.provider_id && base44.auth?.updateMe) {
        try {
          await base44.auth.updateMe({
            provider_id: oauthProfile.providerId,
            provider: oauthProfile.provider
          });
          user.provider_id = oauthProfile.providerId;
          user.provider = oauthProfile.provider;
        } catch (updateErr) {
          console.warn('Could not link provider ID to user:', updateErr);
          // Continue anyway—user is authenticated, linking is optional
        }
      }

      return user;
    }

    // If no authenticated session yet, query the User entity for an existing account
    // This handles the case where the user previously registered with the same email
    const userEntity = base44.entities?.User;
    if (userEntity && typeof userEntity.filter === 'function') {
      try {
        const existingUsers = await userEntity.filter({
          email: normalizedEmail
        });

        if (existingUsers && existingUsers.length > 0) {
          const existingUser = existingUsers[0];

          // If provider_id is missing, link it now
          if (!existingUser.provider_id && typeof userEntity.update === 'function') {
            try {
              await userEntity.update(existingUser.id, {
                provider_id: oauthProfile.providerId,
                provider: oauthProfile.provider,
                updated_at: new Date().toISOString()
              });
            } catch (linkErr) {
              console.warn('Could not link provider ID:', linkErr);
            }
          }

          return {
            id: existingUser.id,
            email: normalizeEmail(existingUser.email),
            name: existingUser.name || oauthProfile.name,
            provider_id: existingUser.provider_id || oauthProfile.providerId,
            provider: existingUser.provider || oauthProfile.provider,
            created_at: existingUser.created_at,
            updated_at: new Date().toISOString()
          };
        }
      } catch (err) {
        console.warn('Error querying User entity:', err);
      }
    }

    // No existing user found. Create one idempotently.
    // Use the provider ID as a fallback unique identifier in case of email conflicts.
    return await createUserIdempotently(oauthProfile, normalizedEmail);
  } catch (error) {
    console.error('Unrecoverable error in findOrCreateUserByOAuth:', error);
    throw error;
  }
}

/**
 * Create a user account idempotently.
 * On retries, returns the existing user instead of failing with a unique constraint violation.
 */
async function createUserIdempotently(
  oauthProfile: OAuthProfile,
  normalizedEmail: string
): Promise<UserAccount> {
  const userEntity = base44.entities?.User;
  if (!userEntity || typeof userEntity.create !== 'function') {
    throw new Error('User entity not available for creation');
  }

  const newUserData = {
    email: normalizedEmail,
    name: oauthProfile.name,
    provider_id: oauthProfile.providerId,
    provider: oauthProfile.provider,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  try {
    const createdUser = await userEntity.create(newUserData);
    return {
      id: createdUser.id,
      email: normalizedEmail,
      name: oauthProfile.name,
      provider_id: oauthProfile.providerId,
      provider: oauthProfile.provider,
      created_at: createdUser.created_at || newUserData.created_at,
      updated_at: createdUser.updated_at || newUserData.updated_at
    };
  } catch (createErr: any) {
    // If creation fails due to unique constraint (409, duplicate key), 
    // retry the lookup one more time before giving up.
    if (createErr.status === 409 || createErr.message?.includes('unique')) {
      console.warn('Unique constraint on user creation, retrying lookup:', createErr);
      
      try {
        const retryUsers = await userEntity.filter?.({ email: normalizedEmail });
        if (retryUsers && retryUsers.length > 0) {
          const foundUser = retryUsers[0];
          
          // Link provider if missing
          if (!foundUser.provider_id && typeof userEntity.update === 'function') {
            try {
              await userEntity.update(foundUser.id, {
                provider_id: oauthProfile.providerId,
                provider: oauthProfile.provider
              });
            } catch (linkErr) {
              console.warn('Second link attempt failed:', linkErr);
            }
          }

          return {
            id: foundUser.id,
            email: normalizeEmail(foundUser.email),
            name: foundUser.name || oauthProfile.name,
            provider_id: foundUser.provider_id || oauthProfile.providerId,
            provider: foundUser.provider || oauthProfile.provider,
            created_at: foundUser.created_at,
            updated_at: new Date().toISOString()
          };
        }
      } catch (retryErr) {
        console.error('Retry lookup also failed:', retryErr);
      }
    }

    throw createErr;
  }
}

/**
 * Find or create an AthleteProfile for a user, using upsert semantics.
 * This prevents "user already has a profile" errors on onboarding retries.
 */
export async function findOrCreateAthleteProfile(
  userId: string,
  profileData: Partial<AthleteProfile>
): Promise<AthleteProfile> {
  try {
    // Query for existing athlete profile
    const existingProfiles = await base44AthleteProfileRepo.filter({
      created_by_id: userId
    });

    if (existingProfiles && existingProfiles.length > 0) {
      // Profile exists—update it instead of creating a duplicate
      const existingProfile = existingProfiles[0];
      const updated = await base44AthleteProfileRepo.update(existingProfile.id, {
        ...profileData,
        updated_at: new Date().toISOString()
      });

      return {
        id: updated.id,
        created_by_id: userId,
        created_at: updated.created_at || existingProfile.created_at,
        updated_at: updated.updated_at || new Date().toISOString(),
        ...updated
      };
    }

    // No profile exists—create one
    const created = await base44AthleteProfileRepo.create({
      ...profileData,
      created_by_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    return {
      id: created.id,
      created_by_id: userId,
      created_at: created.created_at || new Date().toISOString(),
      updated_at: created.updated_at || new Date().toISOString(),
      ...created
    };
  } catch (error: any) {
    // If creation fails due to unique constraint, retry the lookup
    if (error.status === 409 || error.message?.includes('unique')) {
      console.warn('Unique constraint on athlete profile creation, retrying lookup:', error);

      try {
        const retryProfiles = await base44AthleteProfileRepo.filter({
          created_by_id: userId
        });

        if (retryProfiles && retryProfiles.length > 0) {
          const foundProfile = retryProfiles[0];
          const updated = await base44AthleteProfileRepo.update(foundProfile.id, {
            ...profileData,
            updated_at: new Date().toISOString()
          });

          return {
            id: updated.id,
            created_by_id: userId,
            created_at: updated.created_at || foundProfile.created_at,
            updated_at: updated.updated_at || new Date().toISOString(),
            ...updated
          };
        }
      } catch (retryErr) {
        console.error('Retry lookup for athlete profile also failed:', retryErr);
      }
    }

    throw error;
  }
}

/**
 * Resolve a half-authenticated or stuck user state.
 * Call this if the user bounces between login/register or gets stuck in onboarding.
 */
export async function resolveUserState(userId: string): Promise<UserAccount | null> {
  try {
    const userEntity = base44.entities?.User;
    if (!userEntity) return null;

    const user = await userEntity.get?.(userId);
    if (!user) return null;

    return {
      id: user.id,
      email: normalizeEmail(user.email),
      name: user.name,
      provider_id: user.provider_id,
      provider: user.provider,
      created_at: user.created_at,
      updated_at: user.updated_at
    };
  } catch (error) {
    console.error('Error resolving user state:', error);
    return null;
  }
}

/**
 * Clear any stale or half-linked provider associations for a user.
 * Use this before re-linking to a different provider.
 */
export async function unlinkProvider(userId: string): Promise<void> {
  try {
    const userEntity = base44.entities?.User;
    if (!userEntity || typeof userEntity.update !== 'function') {
      console.warn('User entity not available for unlinking');
      return;
    }

    await userEntity.update(userId, {
      provider_id: null,
      provider: null,
      updated_at: new Date().toISOString()
    });
  } catch (error) {
    console.warn('Error unlinking provider:', error);
  }
}
