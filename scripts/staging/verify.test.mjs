import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verifyManifest, verifyStripe } from './verify.mjs';

const manifest = {
  environment: 'staging', productionAppId: 'production-id', stagingAppId: 'staging-id',
  productionOrigins: ['https://trainpacelab.com'], stagingOrigin: 'https://tpl-staging.base44.app',
  syntheticDataOnly: true, externalSyncDisabled: true,
};
test('rejects same app ID, production host and placeholder configurations', () => {
  assert.throws(() => verifyManifest({ ...manifest, stagingAppId: manifest.productionAppId }));
  assert.throws(() => verifyManifest({ ...manifest, stagingOrigin: 'https://trainpacelab.base44.app' }));
  assert.throws(() => verifyManifest({ ...manifest, stagingAppId: 'REPLACE_ME' }));
  assert.equal(verifyManifest(manifest).stagingAppId, 'staging-id');
});
test('rejects live keys before making a request', async () => {
  let called = false;
  await assert.rejects(() => verifyStripe({ STRIPE_TEST_SECRET_KEY: 'sk_live_invalid' }, () => { called = true; }));
  assert.equal(called, false);
});
test('checks Stripe test mode without claiming webhook routing is verified', async () => {
  const env = { STRIPE_TEST_SECRET_KEY: 'sk_test_synthetic', STRIPE_TEST_WEBHOOK_SECRET: 'whsec_synthetic' };
  assert.deepEqual(await verifyStripe(env, async () => ({ ok: true, json: async () => ({ livemode: false }) })), { stripeTestAuthenticationVerified: true, webhookRoutingVerified: false });
  await assert.rejects(() => verifyStripe(env, async () => ({ ok: true, json: async () => ({ livemode: true }) })));
  await assert.rejects(() => verifyStripe({ ...env, STRIPE_SECRET_KEY: 'sk_live_invalid' }));
});
