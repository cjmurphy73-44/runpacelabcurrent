import { describe, expect, it } from 'vitest';
import { stripeEventLedgerKey } from '../../../base44/shared/stripeEventLedgerKey';
describe('Stripe webhook event identity', () => {
  it('accepts valid signed event envelope IDs in both modes', () => {
    expect(stripeEventLedgerKey({ id: 'evt_123Abc', type: 'invoice.paid', livemode: false })).toBe('stripe:evt_123Abc');
    expect(stripeEventLedgerKey({ id: 'evt_456Def', type: 'customer.subscription.deleted', livemode: true })).toBe('stripe:evt_456Def');
  });
  it('rejects missing or malformed IDs before deduplication', () => {
    for (const id of [undefined, null, '', 'undefined', 'evt_', 'evt_123:other', 'evt_123
', 123]) {
      expect(stripeEventLedgerKey({ id, type: 'invoice.paid', livemode: false })).toBeNull();
    }
  });
  it('rejects missing type and malformed mode', () => {
    expect(stripeEventLedgerKey({ id: 'evt_123', livemode: false })).toBeNull();
    expect(stripeEventLedgerKey({ id: 'evt_123', type: 'invoice.paid', livemode: 'false' })).toBeNull();
    expect(stripeEventLedgerKey(null)).toBeNull();
  });
});
