import { describe, expect, it } from 'vitest';
import { reconcileSubscriptionLifecycle as reconcile, type EntitlementRecord } from '../../../base44/shared/stripeLifecycleReconciliation';

const active = { id: 'sub_fixture', status: 'active', plan: 'pro' };
const prior: EntitlementRecord = { stripe_subscription_id: 'sub_fixture', plan: 'pro', status: 'active', initial_payment_verified: true };
const input = (overrides: Record<string, unknown> = {}) => ({
  eventSubscriptionId: 'sub_fixture', eventType: 'customer.subscription.updated',
  prior, authoritative: active, snapshotReadSucceeded: true,
  paidCheckoutVerified: false, ...overrides,
});
describe('authoritative Stripe lifecycle reconciliation, source only', () => {
  it('never grants on subscription.created before first verified payment', () => {
    expect(reconcile(input({ prior: null, eventType: 'customer.subscription.created' }))).toEqual({ action: 'ignore', reason: 'first_payment_unverified' });
  });
  it('grants only verified paid checkout with matching authoritative snapshot', () => {
    const r = reconcile(input({ prior: null, eventType: 'checkout.session.completed', paidCheckoutVerified: true }));
    expect(r.action).toBe('write');
    if (r.action === 'write') expect(r.next.status).toBe('active');
    expect(reconcile(input({ prior: null, eventType: 'checkout.session.completed', paidCheckoutVerified: false })).action).toBe('ignore');
  });
  it('reconciles failed renewal from current Stripe status', () => {
    const r = reconcile(input({ authoritative: { ...active, status: 'past_due' } }));
    expect(r.action).toBe('write');
    if (r.action === 'write') expect(r.next.status).toBe('past_due');
  });
  it('recovers after paid renewal from current Stripe status', () => {
    const r = reconcile(input({ prior: { ...prior, status: 'past_due' } }));
    expect(r.action).toBe('write');
    if (r.action === 'write') expect(r.next.status).toBe('active');
  });
  it('revokes cancellation using authoritative canceled status', () => {
    const r = reconcile(input({ eventType: 'customer.subscription.deleted', authoritative: { ...active, status: 'canceled' } }));
    expect(r.action).toBe('write');
    if (r.action === 'write') expect(r.next).toMatchObject({ plan: 'free', status: 'canceled' });
  });
  it('stale cancellation after recovery does not revoke active subscription', () => {
    expect(reconcile(input({ eventType: 'customer.subscription.deleted' }))).toEqual({ action: 'ignore', reason: 'already_reconciled' });
  });
  it('stale active update after cancellation does not restore access', () => {
    expect(reconcile(input({ prior: { ...prior, plan: 'free', status: 'canceled' }, authoritative: { ...active, status: 'canceled' } })).action).toBe('ignore');
  });
  it('repeated delivery is a no-op after prior state matches', () => {
    expect(reconcile(input())).toEqual({ action: 'ignore', reason: 'already_reconciled' });
  });
  it('fails closed on snapshot failures and identity mismatch', () => {
    expect(reconcile(input({ snapshotReadSucceeded: false })).action).toBe('retry');
    expect(reconcile(input({ authoritative: null })).action).toBe('retry');
    expect(reconcile(input({ authoritative: { ...active, id: 'sub_other' } })).action).toBe('retry');
    expect(reconcile(input({ prior: { ...prior, stripe_subscription_id: 'sub_other' } })).action).toBe('retry');
  });
  it('does not trust unknown prices or unsupported event types', () => {
    expect(reconcile(input({ authoritative: { ...active, plan: null } })).action).toBe('retry');
    expect(reconcile(input({ eventType: 'invoice.paid' })).action).toBe('ignore');
  });
});
