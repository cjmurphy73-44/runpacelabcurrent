// base44/shared/planGate.ts
// Server-side plan enforcement shared by gated backend functions.
// The frontend FeatureGate only *hides* paid features; without this check a
// free-tier user could call the gated functions directly via the SDK and burn
// Core InvokeLLM credits. Reads the caller's Subscription under the service
// role (webhook-provisioned subscriptions have no created_by_id the user client
// can see under read RLS) and returns whether the caller's plan is paid.
// Admins bypass. Mirrors the PAID_PLANS set from src/lib/subscriptionFeatures.ts.

export const PAID_PLANS = new Set(['pro', 'unlimited', 'coach_pro', 'team']);

export function isSubscriptionActive(
  subscription?: { status?: string | null; current_period_end?: string | null } | null,
  now = Date.now(),
): boolean {
  if (!subscription) return false;
  const { status, current_period_end } = subscription;
  if (status && status !== 'active' && status !== 'trialing') return false;
  return current_period_end == null || Date.parse(current_period_end) > now;
}

export async function assertPaidPlan(base44: any, user: any): Promise<{ ok: boolean; plan: string }> {
  if (user?.role === 'admin') return { ok: true, plan: 'admin' };
  try {
    const subs = await base44.asServiceRole.entities.Subscription.filter({ user_id: user.id }, '-created_date', 1);
    const sub = subs[0];
    const plan = isSubscriptionActive(sub) ? (sub.plan || 'free') : 'free';
    return { ok: PAID_PLANS.has(plan), plan };
  } catch {
    return { ok: false, plan: 'free' };
  }
}
