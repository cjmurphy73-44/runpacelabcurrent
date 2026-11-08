import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

function concrete(value, label) {
  if (typeof value !== 'string' || !value.trim() || /REPLACE|EXAMPLE|PLACEHOLDER/i.test(value)) throw new Error(`${label} must be a verified value, not a placeholder`);
  return value.trim();
}

function origin(value, label) {
  const u = new URL(concrete(value, label));
  if (u.protocol !== 'https:' || u.username || u.password || u.pathname !== '/' || u.search || u.hash) throw new Error(`${label} must be an HTTPS origin`);
  // DNS treats a final dot as the same host. Reject this noncanonical form so
  // string comparisons cannot mistake a production host for isolated staging.
  if (u.hostname.endsWith('.')) throw new Error(`${label} must not use a trailing-dot hostname`);
  return u.origin;
}

export function verifyManifest(manifest) {
  if (manifest.environment !== 'staging' || manifest.syntheticDataOnly !== true || manifest.externalSyncDisabled !== true) throw new Error('Staging requires synthetic data and disabled external sync');
  const productionAppId = concrete(manifest.productionAppId, 'productionAppId');
  const stagingAppId = concrete(manifest.stagingAppId, 'stagingAppId');
  if (productionAppId === stagingAppId) throw new Error('Staging and production app IDs must differ');
  if (!Array.isArray(manifest.productionOrigins) || !manifest.productionOrigins.length) throw new Error('productionOrigins is required');
  const productionOrigins = new Set([
    'https://trainpacelab.com', 'https://trainpacelab.base44.app',
    ...manifest.productionOrigins.map(value => origin(value, 'productionOrigin')),
  ]);
  const stagingOrigin = origin(manifest.stagingOrigin, 'stagingOrigin');
  if (productionOrigins.has(stagingOrigin) || [...productionOrigins].some(value => new URL(value).hostname === new URL(stagingOrigin).hostname)) throw new Error('Staging must not use a production host');
  return { ...manifest, productionAppId, stagingAppId, stagingOrigin };
}

export async function verifyStripe(env = process.env, fetchImpl = fetch) {
  if (!/^sk_test_[A-Za-z0-9]+$/.test(env.STRIPE_TEST_SECRET_KEY || '')) throw new Error('STRIPE_TEST_SECRET_KEY must be a Stripe test key');
  if (!/^whsec_[A-Za-z0-9]+$/.test(env.STRIPE_TEST_WEBHOOK_SECRET || '')) throw new Error('A dedicated test webhook secret is required');
  for (const name of ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'PRO_PRICE_ID', 'UNLIMITED_PRICE_ID', 'COACH_PRO_PRICE_ID', 'TEAM_PRICE_ID']) {
    if (env[name]) throw new Error(`Do not provide production billing variable ${name} to this verification process`);
  }
  const r = await fetchImpl('https://api.stripe.com/v1/balance', {
    headers: { Authorization: `Bearer ${env.STRIPE_TEST_SECRET_KEY}` }, signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) throw new Error(`Stripe test authentication failed (${r.status})`);
  if ((await r.json()).livemode !== false) throw new Error('Stripe did not confirm test mode');
  // A whsec prefix alone does not establish endpoint ownership. The signed-event
  // staging acceptance test must establish which endpoint receives this secret.
  return { stripeTestAuthenticationVerified: true, webhookRoutingVerified: false };
}

async function main() {
  const args = process.argv.slice(2);
  const manifest = verifyManifest(JSON.parse(await readFile(resolve(args[0] || 'staging/manifest.local.json'), 'utf8')));
  const stripe = args.includes('--check-stripe') ? await verifyStripe() : { stripeTestAuthenticationVerified: false, webhookRoutingVerified: false };
  console.log(JSON.stringify({ stagingAppId: manifest.stagingAppId, stagingOrigin: manifest.stagingOrigin, manifestValid: true, deployedIsolationVerified: false, ...stripe }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(e => { console.error(e.message); process.exitCode = 1; });
