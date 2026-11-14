// Release-gated, pure reconciliation of Stripe subscription lifecycle.
// A webhook payload is a notification, NOT the authoritative current state.
// This module does not write entitlements or call Stripe.
export type SubscriptionSnapshot = {
  id: string;
  status: string;
  plan: string | null;
};
export type EntitlementRecord = {
  stripe_subscription_id: string;
  plan: string;
  status: 'active' | 'past_due' | 'canceled';
  initial_payment_verified: boolean;
};
export type ReconcileDecision =
  | { action: 'retry'; reason: string }
  | { action: 'ignore'; reason: string }
  | { action: 'write'; next: EntitlementRecord };

export function reconcileSubscriptionLifecycle(input: {
  eventSubscriptionId: string;
  eventType: string;
  prior: EntitlementRecord | null;
  authoritative: SubscriptionSnapshot | null;
  snapshotReadSucceeded: boolean;
  paidCheckoutVerified: boolean;
}): ReconcileDecision {
  const { eventSubscriptionId, eventType, prior, authoritative, snapshotReadSucceeded, paidCheckoutVerified } = input;
  if (!eventSubscriptionId || !eventSubscriptionId.startsWith('sub_')) return { action: 'retry', reason: 'invalid_subscription_identity' };
  if (!snapshotReadSucceeded) return { action: 'retry', reason: 'authoritative_read_failed' };
  if (prior && prior.stripe_subscription_id !== eventSubscriptionId) return { action: 'retry', reason: 'subscription_identity_conflict' };
  const isCheckout = eventType === 'checkout.session.completed' || eventType === 'checkout.session.async_payment_succeeded';
  const isLifecycle = eventType === 'customer.subscription.created' || eventType === 'customer.subscription.updated' || eventType === 'customer.subscription.deleted';
  if (!isCheckout && !isLifecycle) return { action: 'ignore', reason: 'unsupported_event_type' };
  // An unavailable snapshot is ambiguous: deleted subscriptions may be unavailable,
  // but API failures must not be treated as proof of cancellation.
  if (!authoritative) return { action: 'retry', reason: 'missing_authoritative_snapshot' };
  if (authoritative.id !== eventSubscriptionId) return { action: 'retry', reason: 'snapshot_identity_mismatch' };
  const paid = prior?.initial_payment_verified === true || (isCheckout && paidCheckoutVerified === true);
  if (!paid) return { action: 'ignore', reason: 'first_payment_unverified' };
  if (!authoritative.plan || authoritative.plan === 'free') return { action: 'retry', reason: 'unknown_authoritative_price' };
  const status: EntitlementRecord['status'] =
    authoritative.status === 'active' || authoritative.status === 'trialing' ? 'active'
    : ['past_due', 'unpaid', 'incomplete'].includes(authoritative.status) ? 'past_due'
    : 'canceled';
  const next: EntitlementRecord = {
    stripe_subscription_id: eventSubscriptionId,
    plan: status === 'canceled' ? 'free' : authoritative.plan,
    status,
    initial_payment_verified: true,
  };
  if (prior && Object.keys(next).every(k => prior[k as keyof EntitlementRecord] === next[k as keyof EntitlementRecord])) {
    return { action: 'ignore', reason: 'already_reconciled' };
  }
  return { action: 'write', next };
}
