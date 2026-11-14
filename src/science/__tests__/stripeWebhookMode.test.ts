import { describe, expect, it } from 'vitest';
import { resolveStripeWebhookMode } from '../../../base44/shared/stripeWebhookMode';
describe('Stripe webhook live/test isolation', () => {
  it('routes verified live events to live key only', () => {
    expect(resolveStripeWebhookMode({ livemode: true }, true, false, 'sk_live_example', 'sk_test_example'))
      .toEqual({ ok: true, mode: 'live', apiKey: 'sk_live_example' });
  });
  it('routes verified test events to test key only', () => {
    expect(resolveStripeWebhookMode({ livemode: false }, false, true, 'sk_live_example', 'sk_test_example'))
      .toEqual({ ok: true, mode: 'test', apiKey: 'sk_test_example' });
  });
  it('rejects crossed signatures and absent test key without falling back to live', () => {
    expect(resolveStripeWebhookMode({ livemode: true }, false, true, 'live', 'test')).toMatchObject({ ok: false });
    expect(resolveStripeWebhookMode({ livemode: false }, true, false, 'live', 'test')).toMatchObject({ ok: false });
    expect(resolveStripeWebhookMode({ livemode: false }, false, true, 'live', null)).toMatchObject({ ok: false });
  });
  it('rejects missing, string and ambiguous event mode', () => {
    for (const event of [null, {}, { livemode: 'false' }]) {
      expect(resolveStripeWebhookMode(event, true, true, 'live', 'test')).toMatchObject({ ok: false });
    }
  });
});
