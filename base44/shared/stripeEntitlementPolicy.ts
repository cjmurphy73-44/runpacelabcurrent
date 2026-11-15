// Pure, fail-closed entitlement policy for Stripe subscription lifecycle events.
// A subscription creation event is not proof of a settled first invoice.
export function checkoutEntitlementDecision(
  session: { payment_status?: unknown; subscription?: unknown } | null,
  subscription: { id?: unknown; status?: unknown } | null,
): 'grant' | 'pending' {
  if (!session || session.payment_status !== 'paid') return 'pending';
  if (typeof session.subscription !== 'string' || !session.subscription) return 'pending';
  if (!subscription || subscription.id !== session.subscription) return 'pending';
  return subscription.status === 'active' ? 'grant' : 'pending';
}

export function lifecycleEntitlementStatus(status: unknown): 'active' | 'past_due' | 'canceled' {
  if (status === 'active' || status === 'trialing') return 'active';
  if (status === 'past_due' || status === 'unpaid' || status === 'incomplete') return 'past_due';
  return 'canceled';
}
