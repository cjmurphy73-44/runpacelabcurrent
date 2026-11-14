import { describe, expect, it } from 'vitest';
import { checkoutEntitlementDecision, lifecycleEntitlementStatus } from '../../../base44/shared/stripeEntitlementPolicy';
const sub = { id: 'sub_synthetic', status: 'active' };
describe('Stripe entitlement lifecycle policy', () => {
  it('grants only settled paid checkout tied to the same active subscription', () => {
    expect(checkoutEntitlementDecision({ payment_status: 'paid', subscription: sub.id }, sub)).toBe('grant');
  });
  it('does not grant on pending, unpaid or no-payment-required checkout', () => {
    for (const payment_status of ['unpaid', 'pending', 'no_payment_required', undefined]) {
      expect(checkoutEntitlementDecision({ payment_status, subscription: sub.id }, sub)).toBe('pending');
    }
  });
  it('does not grant on mismatched, missing or inactive subscriptions', () => {
    expect(checkoutEntitlementDecision({ payment_status: 'paid', subscription: 'sub_other' }, sub)).toBe('pending');
    for (const status of ['incomplete', 'past_due', 'unpaid', 'canceled', 'trialing']) {
      expect(checkoutEntitlementDecision({ payment_status: 'paid', subscription: sub.id }, { ...sub, status })).toBe('pending');
    }
    expect(checkoutEntitlementDecision({ payment_status: 'paid', subscription: sub.id }, null)).toBe('pending');
  });
  it('maps failed payment and cancellation to non-active entitlements', () => {
    expect(lifecycleEntitlementStatus('active')).toBe('active');
    expect(lifecycleEntitlementStatus('trialing')).toBe('active');
    for (const status of ['past_due', 'unpaid', 'incomplete']) expect(lifecycleEntitlementStatus(status)).toBe('past_due');
    for (const status of ['canceled', 'incomplete_expired', 'paused', undefined]) expect(lifecycleEntitlementStatus(status)).toBe('canceled');
  });
});
