// base44/shared/planGate.ts
// Server-side plan enforcement shared by gated backend functions.
// The frontend FeatureGate only *hides* paid features; without this check a
// free-tier user could call the gated functions directly via the SDK and burn
// Core InvokeLLM credits. Reads the caller's Subscription under the service
// role (webhook-provisioned subscriptions have no created_by_id the user client
// can see under read RLS) and returns whether the caller's plan is paid.
// Admins bypass. Mirrors the PAID_PLANS set from src/lib/subscriptionFeatures.ts.

const PAID_PLANS = new Set(['pro', 'unlimited', 'coach_pro', 'team']);

export async function assertPaidPlan(base44: any, user: any): Promise<{ ok: boolean; plan: string }> {
  if (user?.role === 'admin') return { ok: true, plan: 'admin' };
  try {
    const subs = await base44.asServiceRole.entities.Subscription.filter({ user_id: user.id }, '-created_date', 1);
    const sub = subs[0];
    const status = sub?.status;
    const active = !status || status === 'active' || status === 'trialing';
    const plan = active ? (sub?.plan || 'free') : 'free';
    return { ok: PAID_PLANS.has(plan), plan };
  } catch {
    return { ok: false, plan: 'free' };
  }
}