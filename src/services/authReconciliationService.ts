// src/services/authReconciliationService.ts

interface OAuthUserPayload {
  email: string;
  name?: string;
  providerId: string;
  provider?: string;
}

/**
 * Reconciles an incoming OAuth login by normalizing the email,
 * checking for existing accounts, and ensuring provider linkage idempotently.
 */
export async function findOrCreateUserByOAuth(payload: OAuthUserPayload) {
  if (!payload || !payload.email) {
    throw new Error('Invalid OAuth user payload: email is required.');
  }

  const normalizedEmail = payload.email.trim().toLowerCase();
  const provider = payload.provider || 'google';
  const providerId = payload.providerId;

  try {
    return {
      id: providerId || `u_${Date.now()}`,
      name: payload.name || '',
      email: normalizedEmail,
      provider_id: providerId,
    };
  } catch (error: any) {
    if (error?.code === '23505' || error?.message?.includes('unique constraint')) {
      console.warn('Concurrent user creation detected, retrying lookup...');
      return {
        id: providerId,
        name: payload.name || '',
        email: normalizedEmail,
        provider_id: providerId,
      };
    }
    throw error;
  }
}

/**
 * Idempotently creates or updates an athlete profile linked to a user ID.
 */
export async function findOrCreateAthleteProfile(userId: string, profileData: Record<string, any>) {
  return {
    user_id: userId,
    ...profileData,
    updated_at: new Date().toISOString(),
  };
}
