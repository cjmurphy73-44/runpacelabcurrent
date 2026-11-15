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
  it('fails closed on malformed checkout and subscription identifiers', () => {
    const paid = { payment_status: 'paid', subscription: sub.id };
    expect(checkoutEntitlementDecision(null, sub)).toBe('pending');
    expect(checkoutEntitlementDecision(paid, null)).toBe('pending');
    for (const subscription of [undefined, null, '', 0, 123, {}, ['sub_synthetic']]) {
      expect(checkoutEntitlementDecision({ ...paid, subscription }, sub)).toBe('pending');
    }
    for (const id of [undefined, null, '', 123, 'sub_other']) {
      expect(checkoutEntitlementDecision(paid, { ...sub, id })).toBe('pending');
    }
  });

  it('never grants checkout for unknown, malformed or non-active subscription statuses', () => {
    const paid = { payment_status: 'paid', subscription: sub.id };
    for (const status of [undefined, null, '', 'unknown', 'paused', 'incomplete_expired', 'past_due', 'trialing', true, 1]) {
      expect(checkoutEntitlementDecision(paid, { ...sub, status })).toBe('pending');
    }
  });

  it('maps unexpected lifecycle payloads to canceled rather than active', () => {
    for (const status of [undefined, null, '', 'unknown', {}, ['active'], true, 1]) {
      expect(lifecycleEntitlementStatus(status)).toBe('canceled');
    }
  });

  it('maps failed payment and cancellation to non-active entitlements', () => {
    expect(lifecycleEntitlementStatus('active')).toBe('active');
    expect(lifecycleEntitlementStatus('trialing')).toBe('active');
    for (const status of ['past_due', 'unpaid', 'incomplete']) expect(lifecycleEntitlementStatus(status)).toBe('past_due');
    for (const status of ['canceled', 'incomplete_expired', 'paused', undefined]) expect(lifecycleEntitlementStatus(status)).toBe('canceled');
  });
});


describe('synthetic Stripe event ordering and replay', () => {
  // This models policy outcomes only, not Base44 persistence or webhook delivery.
  function replay(events: Array<{ id?: string; kind: string; payment?: string; status?: string; subscription?: string }>) {
    let entitlement = 'free';
    const seen = new Set<string>();
    for (const [index, event] of events.entries()) {
      const eventId = event.id || event.kind + ':' + index;
      if (seen.has(eventId)) continue;
      seen.add(eventId);
      if (event.kind === 'created') continue; // never proof of first payment
      if (event.kind === 'checkout') {
        if (checkoutEntitlementDecision(
          { payment_status: event.payment, subscription: event.subscription },
          { id: 'sub_synthetic', status: event.status },
        ) === 'grant') entitlement = 'active';
      } else if (event.kind === 'updated' && entitlement !== 'free') {
        entitlement = lifecycleEntitlementStatus(event.status);
      } else if (event.kind === 'deleted') {
        entitlement = 'canceled';
      }
    }
    return entitlement;
  }

  it('creation before settlement never grants, confirmed checkout does', () => {
    expect(replay([{ kind: 'created', status: 'active' }, { kind: 'checkout', payment: 'unpaid', status: 'active', subscription: 'sub_synthetic' }])).toBe('free');
    expect(replay([{ kind: 'created', status: 'active' }, { kind: 'checkout', payment: 'paid', status: 'active', subscription: 'sub_synthetic' }])).toBe('active');
  });
  it('failed renewal removes active entitlement and later paid update restores it', () => {
    expect(replay([{ kind: 'checkout', payment: 'paid', status: 'active', subscription: 'sub_synthetic' }, { kind: 'updated', status: 'past_due' }])).toBe('past_due');
    expect(replay([{ kind: 'checkout', payment: 'paid', status: 'active', subscription: 'sub_synthetic' }, { kind: 'updated', status: 'past_due' }, { kind: 'updated', status: 'active' }])).toBe('active');
  });
  it('ignores duplicate event ids in a synthetic replay', () => {
    expect(replay([{ ...{ id: 'evt_paid', kind: 'checkout', payment: 'paid', status: 'active', subscription: 'sub_synthetic' } }, { id: 'evt_cancel', kind: 'deleted' }, { id: 'evt_paid', kind: 'checkout', payment: 'paid', status: 'active', subscription: 'sub_synthetic' }])).toBe('canceled');
  });
  it('cancellation revokes access even after successful checkout', () => {
    expect(replay([{ kind: 'checkout', payment: 'paid', status: 'active', subscription: 'sub_synthetic' }, { kind: 'deleted' }])).toBe('canceled');
  });
});
