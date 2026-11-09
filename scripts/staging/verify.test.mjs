import { test } from 'vitest';
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
test('compares app IDs after trimming surrounding whitespace', () => {
  assert.throws(() => verifyManifest({ ...manifest, stagingAppId: ' production-id ' }), /app IDs must differ/);
  assert.throws(() => verifyManifest({ ...manifest, productionAppId: '\tstaging-id\n' }), /app IDs must differ/);
  const result = verifyManifest({ ...manifest, stagingAppId: ' staging-id ' });
  assert.equal(result.stagingAppId, 'staging-id');
});
test('rejects trailing-dot host aliases before they can bypass production isolation', () => {
  for (const stagingOrigin of ['https://trainpacelab.com.', 'https://trainpacelab.base44.app.', 'https://TRAINPACELAB.COM.:443']) {
    assert.throws(() => verifyManifest({ ...manifest, stagingOrigin }), /trailing-dot hostname/);
  }
  assert.throws(() => verifyManifest({ ...manifest, productionOrigins: ['https://custom-production.invalid.'] }), /trailing-dot hostname/);
  assert.throws(() => verifyManifest({ ...manifest, stagingOrigin: 'https://synthetic-stage.invalid.' }), /trailing-dot hostname/);
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

import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

test('CLI preflight does not disclose private app IDs or origins', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'tpl-staging-preflight-'));
  try {
    const fixture = join(dir, 'manifest.json');
    await writeFile(fixture, JSON.stringify(manifest));
    const result = spawnSync(process.execPath, [fileURLToPath(new URL('./verify.mjs', import.meta.url)), fixture], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    const output = JSON.parse(result.stdout);
    assert.equal(output.manifestValid, true);
    assert.equal(output.deployedIsolationVerified, false);
    assert.equal(output.stripeTestAuthenticationVerified, false);
    for (const privateValue of [manifest.stagingAppId, manifest.productionAppId, manifest.stagingOrigin]) {
      assert.equal(result.stdout.includes(privateValue), false, 'private environment value leaked to stdout');
    }
    assert.equal('stagingAppId' in output, false);
    assert.equal('stagingOrigin' in output, false);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
