import { build } from 'esbuild';
import { createHmac, webcrypto } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import { beforeAll, describe, expect, it, vi } from 'vitest';

const prod = '6a504ebe6a5a6d1be058226c';
const stage = '6aefe9d09e2788fc8591c758';
const config = {
  STRIPE_SECRET_KEY: 'sk_live_fixture', STRIPE_WEBHOOK_SECRET: 'live-fixture-secret', PRO_PRICE_ID: 'price_live',
  STRIPE_TEST_SECRET_KEY: 'sk_test_fixture', STRIPE_TEST_WEBHOOK_SECRET: 'test-fixture-secret', STRIPE_TEST_PRO_PRICE_ID: 'price_test',
};
const handlers = {};

beforeAll(async () => {
  await Promise.all(['stripeCheckout', 'stripeTestCheckout', 'stripeBillingPortal', 'stripeWebhook'].map(async (name) => {
    const result = await build({
      entryPoints: [`base44/functions/${name}/entry.ts`], bundle: true, platform: 'node', format: 'cjs', write: false,
      plugins: [{ name: 'stripe-runtime-fixture', setup(builder) {
        builder.onResolve({ filter: /^npm:@base44\/sdk@|^base44:runtime$/ }, ({ path }) => ({ path, namespace: 'fixture' }));
        builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({
          contents: 'export const secrets = { get: (name) => globalThis.config[name] }; export const createClientFromRequest = () => globalThis.base44;',
        }));
      } }],
    });
    handlers[name] = result.outputFiles[0].text;
  }));
});

function fixture(appId, { settings = {}, customer = null, seen = false } = {}) {
  const subscription = { filter: vi.fn(async () => customer ? [{ stripe_customer_id: customer }] : []), create: vi.fn(), update: vi.fn() };
  const events = { filter: vi.fn(async () => seen ? [{}] : []), create: vi.fn() };
  const fetch = vi.fn();
  const base44 = {
    auth: { me: async () => ({ id: 'athlete' }) },
    entities: { Subscription: subscription },
    asServiceRole: { entities: { User: { get: async () => ({ id: 'athlete' }) }, Subscription: subscription, WebhookEvent: events } },
  };
  return {
    subscription, fetch,
    async invoke(name, payload, signatureSecret) {
      const module = { exports: {} };
      runInNewContext(handlers[name], {
        Request, Response, URLSearchParams, TextEncoder, fetch, module, base44,
        config: { ...config, ...settings }, Deno: { env: { get: () => appId } },
        console: { error: vi.fn(), warn: vi.fn() }, crypto: webcrypto,
      });
      const body = JSON.stringify(payload);
      const ts = Math.floor(Date.now() / 1000);
      const signature = signatureSecret && createHmac('sha256', signatureSecret).update(`${ts}.${body}`).digest('hex');
      return module.exports.default(new Request('https://example.test/functions', {
        method: 'POST', body,
        headers: { 'X-Base44-App-Url': 'https://untrusted.example', 'stripe-signature': signature ? `t=${ts},v1=retired,v1=${signature}` : '' },
      }));
    },
  };
}

function stripeEvent(appId, livemode, fields = {}) {
  return { id: 'evt_fixture', type: 'checkout.session.completed', livemode, data: { object: {
    subscription: 'sub_fixture', customer: 'cus_fixture', client_reference_id: 'athlete',
    metadata: { base44_app_id: appId, user_id: 'athlete' }, payment_status: 'paid', amount_total: 900, currency: 'aud', ...fields,
  } } };
}

const stripeSubscription = {
  id: 'sub_fixture', livemode: false, customer: 'cus_fixture', status: 'active', metadata: { base44_app_id: stage, user_id: 'athlete' },
  items: { data: [{ price: { id: 'price_test', unit_amount: 900, currency: 'aud' } }] },
};

describe('billing release isolation', () => {
  it('pauses live checkout by default and keeps the subscriber portal available', async () => {
    const f = fixture(prod, { customer: 'cus_fixture' });
    expect(await (await f.invoke('stripeCheckout', { action: 'status' })).json()).toEqual({ available: false });
    expect((await f.invoke('stripeCheckout', { plan: 'pro' })).status).toBe(503);
    expect((await f.invoke('stripeTestCheckout', {})).status).toBe(404);
    expect(f.fetch).not.toHaveBeenCalled();
    f.fetch.mockResolvedValue(Response.json({ url: 'https://billing.stripe.com/fixture' }));
    expect((await f.invoke('stripeBillingPortal', {})).status).toBe(200);
    expect(f.fetch.mock.calls[0][1].body.get('return_url')).toBe('https://trainpacelab.com/subscribe');
  });

  it('uses only configured test billing on private staging and binds checkout to the session and app', async () => {
    const f = fixture(stage, { settings: { STRIPE_PUBLIC_CHECKOUT: 'enabled' } });
    expect((await f.invoke('stripeCheckout', { plan: 'pro' })).status).toBe(503);
    expect((await fixture(stage, { settings: { STRIPE_TEST_SECRET_KEY: 'sk_live_fixture' } }).invoke('stripeTestCheckout', {})).status).toBe(503);
    f.fetch.mockResolvedValue(Response.json({ url: 'https://checkout.stripe.com/fixture' }));
    expect((await f.invoke('stripeTestCheckout', { user_id: 'unrelated' })).status).toBe(200);
    const options = f.fetch.mock.calls[0][1];
    expect(options.headers.Authorization).toBe('Bearer sk_test_fixture');
    expect(options.body.get('client_reference_id')).toBe('athlete');
    expect(options.body.get('metadata[base44_app_id]')).toBe(stage);
    expect(options.body.get('success_url')).toMatch(/^https:\/\/train-pace-lab-copy-8591c758\.base44\.app\//);
  });

  it('rejects Stripe test events in production even if test secrets are configured', async () => {
    const f = fixture(prod);
    for (const secret of [config.STRIPE_TEST_WEBHOOK_SECRET, config.STRIPE_WEBHOOK_SECRET]) {
      expect((await f.invoke('stripeWebhook', stripeEvent(prod, false), secret)).status).toBe(400);
    }
    expect(f.fetch).not.toHaveBeenCalled();
    expect(f.subscription.create).not.toHaveBeenCalled();
  });

  it('grants a staged paid entitlement only for the exact paid checkout and subscription', async () => {
    const f = fixture(stage);
    const sig = config.STRIPE_TEST_WEBHOOK_SECRET;
    const pending = await f.invoke('stripeWebhook', stripeEvent(stage, false, { payment_status: 'unpaid' }), sig);
    expect(await pending.json()).toMatchObject({ pending: 'unpaid' });
    expect(f.fetch).not.toHaveBeenCalled();
    expect(f.subscription.create).not.toHaveBeenCalled();

    f.fetch.mockImplementation(async () => Response.json(stripeSubscription));
    await f.invoke('stripeWebhook', stripeEvent(stage, false, { amount_total: 1 }), sig);
    await f.invoke('stripeWebhook', stripeEvent(prod, false), sig);
    expect(f.subscription.create).not.toHaveBeenCalled();

    expect((await f.invoke('stripeWebhook', stripeEvent(stage, false), sig)).status).toBe(200);
    expect(f.subscription.create).toHaveBeenCalledTimes(1);
    expect(f.subscription.create).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'athlete', plan: 'pro', status: 'active' }));
  });
});
