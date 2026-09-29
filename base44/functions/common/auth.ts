// base44/functions/common/auth.ts
// Helper to verify server-side subscription tier and rate limits

import { createClientFromRequest } from 'npm:@base44/runtime';

export async function verifySubscription(req: Request, requiredTier: 'pro' | 'elite' = 'pro'): Promise<{ authorized: boolean; userId?: string; error?: string }> {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.getCurrentUser();

  if (!user) {
    return { authorized: false, error: 'Unauthorized: Missing or invalid session' };
  }

  // Fetch user profile / subscription record from database
  const { data: profile } = await base44.asServiceRole().entities.User.filter({ id: user.id }).getFirst();

  if (!profile) {
    return { authorized: false, error: 'User profile not found' };
  }

  const tier = profile.subscription_tier || 'free';

  // Tier hierarchy: elite > pro > free
  const tierLevels: Record<string, number> = { free: 0, pro: 1, elite: 2 };
  
  if (tierLevels[tier] < tierLevels[requiredTier]) {
    return { authorized: false, error: `Forbidden: Requires ${requiredTier} subscription tier` };
  }

  return { authorized: true, userId: user.id };
}
