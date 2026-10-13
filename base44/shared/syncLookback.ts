// base44/shared/syncLookback.ts
// Resolves the caller's historical-sync lookback window from their subscription
// plan. Free tier is capped (mirrors FREE_LIMITS.syncLookbackDays in
// src/lib/subscriptionFeatures.ts); paid plans (pro/unlimited/coach_pro/team)
// pull the full window the sync function requests. Failures default to the free
// cap (fail closed) so a missing subscription never grants unlimited history.
// A canceled / past_due subscription is treated as free.

const FREE_LOOKBACK_DAYS = 90;
const PAID_PLANS = new Set(['pro', 'unlimited', 'coach_pro', 'team']);

export async function getSyncLookbackDays(base44: any, userId: string): Promise<number> {
  try {
    const subs = await base44.asServiceRole.entities.Subscription.filter(
      { user_id: userId },
      '-created_date',
      1,
    );
    const sub = subs?.[0];
    const active = !sub?.status || sub.status === 'active' || sub.status === 'trialing';
    return active && PAID_PLANS.has(sub?.plan) ? Infinity : FREE_LOOKBACK_DAYS;
  } catch {
    return FREE_LOOKBACK_DAYS;
  }
}