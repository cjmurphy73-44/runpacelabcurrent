import { describe, expect, it } from 'vitest';
import { trustedStripeBillingUrl } from './trustedStripeBillingUrl';

describe('Stripe billing redirect trust boundary', () => {
  it('accepts only the correct Stripe-hosted destination', () => {
    expect(trustedStripeBillingUrl('https://checkout.stripe.com/c/pay/cs_test_123?prefilled_email=x', 'checkout')).toContain('checkout.stripe.com');
    expect(trustedStripeBillingUrl('https://billing.stripe.com/p/session/test_123', 'portal')).toContain('billing.stripe.com');
    expect(trustedStripeBillingUrl('https://billing.stripe.com/p/session/test_123', 'checkout')).toBeNull();
    expect(trustedStripeBillingUrl('https://checkout.stripe.com/c/pay/cs_test_123', 'portal')).toBeNull();
  });
  it('rejects deceptive origins and unsafe protocols', () => {
    for (const url of [
      'javascript:alert(1)', '//checkout.stripe.com/c/pay',
      'http://checkout.stripe.com/c/pay',
      'https://checkout.stripe.com.evil.test/c/pay',
      'https://checkout.stripe.com@evil.test/c/pay',
      'https://evil.test/checkout.stripe.com',
      'https://checkout.stripe.com:444/c/pay',
      'https://user:pass@checkout.stripe.com/c/pay',
      'https://checkout.stripe.com/c/pay#fragment',
      'https://checkout.stripe.com/c/pay\\n',
    ]) expect(trustedStripeBillingUrl(url, 'checkout')).toBeNull();
  });
  it('fails closed for missing, malformed or unsupported values', () => {
    for (const value of [null, undefined, {}, 3, '', 'not-a-url']) {
      expect(trustedStripeBillingUrl(value, 'checkout')).toBeNull();
    }
    expect(trustedStripeBillingUrl('https://checkout.stripe.com/c/pay', 'other')).toBeNull();
  });
});
