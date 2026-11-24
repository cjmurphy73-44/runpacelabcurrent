import { secrets } from 'base44:runtime';

const LIVE_APP = '6a504ebe6a5a6d1be058226c';
const TEST_APP = '6aefe9d09e2788fc8591c758';

export function stripeSecret(name: string): string | null {
  try { return secrets.get(name) || null; } catch { return null; }
}

export function stripeEnvironment() {
  const appId = Deno.env.get('BASE44_APP_ID');
  const test = appId === TEST_APP;
  const live = appId === LIVE_APP;
  // Base44-managed sandboxes store their test key under STRIPE_SECRET_KEY.
  const candidateKey = test ? stripeSecret('STRIPE_TEST_SECRET_KEY') ?? stripeSecret('STRIPE_SECRET_KEY') : live ? stripeSecret('STRIPE_SECRET_KEY') : null;
  const apiKey = candidateKey?.match(test ? /^(sk|rk)_test_/ : /^(sk|rk)_live_/) ? candidateKey : null;
  return {
    appId,
    test,
    apiKey,
    liveCheckout: live && stripeSecret('STRIPE_PUBLIC_CHECKOUT') === 'enabled',
    origin: test ? 'https://train-pace-lab-copy-8591c758.base44.app' : 'https://trainpacelab.com',
    webhookSecret: test ? stripeSecret('STRIPE_TEST_WEBHOOK_SECRET') : live ? stripeSecret('STRIPE_WEBHOOK_SECRET') : null,
  };
}
