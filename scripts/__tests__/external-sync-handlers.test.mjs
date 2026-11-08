// Execute the real entry points and relative import graphs offline. The SDK,
// FIT package and runtime are fixtures; this is not a hosted platform test.
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { build } from 'esbuild';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';

const routers = [
  { name: 'corosSync', actions: ['authorize', 'sync_historical', 'sync_recovery', 'sync_all', 'list_tools', 'disconnect', 'webhook'] },
  { name: 'garminSync', actions: ['authorize', 'sync_historical', 'disconnect'] },
  { name: 'stravaSync', actions: ['authorize', 'sync_historical', 'disconnect'] },
  { name: 'wearableOAuthSync', actions: ['authorize', 'sync', 'disconnect'], provider: 'polar' },
];
const receivers = ['airtableSync', 'garminWebhook', 'workoutWebhook', 'webhookWearableSync'];
const names = [...routers.map(router => router.name), ...receivers];
const bundles = new Map();

beforeAll(async () => {
  await Promise.all(names.map(async name => {
    const result = await build({
      entryPoints: [resolve('base44/functions', name, 'entry.ts')],
      bundle: true, write: false, format: 'cjs', platform: 'node', target: 'es2022',
      plugins: [{
        name: 'offline-runtime-packages',
        setup(builder) {
          builder.onResolve({ filter: /^(npm:|jsr:|base44:)/ }, args => ({ path: args.path, namespace: 'offline-package' }));
          builder.onLoad({ filter: /.*/, namespace: 'offline-package' }, args => {
            if (args.path.startsWith('npm:@base44/sdk@')) {
              return { contents: 'export const createClientFromRequest = (...args) => globalThis.fixtureClient(...args);' };
            }
            if (args.path === 'npm:fit-file-parser') {
              return { contents: 'export default class FitParser { constructor() { throw new Error("FIT parsing is outside this guard test"); } }' };
            }
            if (args.path === 'base44:runtime') {
              return { contents: 'export const waitUntil = (...args) => globalThis.fixtureEffect(...args);' };
            }
            throw new Error(`Add an explicit offline fixture for ${args.path}`);
          });
        },
      }],
    });
    bundles.set(name, result.outputFiles[0].text);
  }));
});

function runtime(name, { mode = 'staging', authenticated = true } = {}) {
  const effect = vi.fn(async () => { throw new Error('Unexpected SDK side effect'); });
  const network = vi.fn(async () => { throw new Error('Unexpected network request'); });
  const reads = vi.fn(async () => []);
  const entity = { get: reads, filter: reads, list: reads, create: effect, update: effect, delete: effect, bulkCreate: effect };
  const entities = new Proxy({}, { get: () => entity });
  const client = {
    auth: { me: vi.fn(async () => authenticated ? { id: 'synthetic-user' } : null) },
    entities, functions: { invoke: effect }, integrations: { Core: { InvokeLLM: effect, SendEmail: effect } },
  };
  client.asServiceRole = client;
  const fixtureClient = vi.fn(() => client);
  const module = { exports: {} };
  let handler;
  const get = vi.fn(key => {
    if (mode === 'denied') throw new Error('Environment access denied');
    if (mode === 'missing') return undefined;
    if (key === 'TPL_ENVIRONMENT') return 'staging';
    if (key === 'TPL_EXTERNAL_SYNC_ENABLED') return 'true';
    return undefined;
  });
  runInNewContext(bundles.get(name), {
    module, exports: module.exports, fixtureClient, fixtureEffect: effect, fetch: network,
    Deno: { env: { get }, serve: callback => { handler = callback; } },
    Request, Response, Headers, URL, URLSearchParams, TextEncoder, TextDecoder,
    crypto: globalThis.crypto, console,
  });
  handler ||= module.exports.default;
  expect(typeof handler).toBe('function');
  return { handler, effect, network, reads, fixtureClient };
}

function request({ action = 'sync_historical', provider, query, headers, rawBody } = {}) {
  const url = `https://synthetic-runtime.invalid/functions/test${query || ''}`;
  if (query) return new Request(url, { headers });
  return new Request(url, {
    method: 'POST', headers: { 'content-type': 'application/json', ...headers },
    body: rawBody ?? JSON.stringify({ action, ...(provider ? { provider } : {}) }),
  });
}

async function expectBlocked(fixture, req) {
  const response = await fixture.handler(req);
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ error: 'External sync is disabled for this environment.' });
  expect(fixture.effect).not.toHaveBeenCalled();
  expect(fixture.network).not.toHaveBeenCalled();
  expect(fixture.reads).not.toHaveBeenCalled();
}

describe.each(names)('%s external-sync boundary', name => {
  it.each(['staging', 'missing', 'denied'])('blocks side effects with %s runtime configuration', async mode => {
    const router = routers.find(router => router.name === name);
    await expectBlocked(runtime(name, { mode }), request({ provider: router?.provider }));
  });
});

describe.each(routers)('$name router paths', router => {
  it.each(router.actions)('blocks the %s action in staging', async action => {
    await expectBlocked(runtime(router.name), request({ action, provider: router.provider }));
  });

  it('blocks the OAuth callback before token exchange', async () => {
    const query = `?code=synthetic-code&state=synthetic-state${router.provider ? `&provider=${router.provider}` : ''}`;
    await expectBlocked(runtime(router.name), request({ query }));
  });

  it('allows a read-only status without a provider request or write', async () => {
    const fixture = runtime(router.name);
    const response = await fixture.handler(request({ action: 'status', provider: router.provider }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ connected: false });
    expect(fixture.reads).toHaveBeenCalled();
    expect(fixture.effect).not.toHaveBeenCalled();
    expect(fixture.network).not.toHaveBeenCalled();
  });

  it('does not make status public merely because sync is disabled', async () => {
    const fixture = runtime(router.name, { authenticated: false });
    const response = await fixture.handler(request({ action: 'status', provider: router.provider }));
    expect(response.status).toBe(401);
    expect(fixture.reads).not.toHaveBeenCalled();
    expect(fixture.effect).not.toHaveBeenCalled();
    expect(fixture.network).not.toHaveBeenCalled();
  });
});

it('does not let a COROS signature disguise a webhook as read-only status', async () => {
  await expectBlocked(runtime('corosSync'), request({ action: 'status', headers: { 'x-coros-signature': 'synthetic-signature' } }));
});

it.each(receivers)('%s blocks malformed payloads before SDK use', async name => {
  const fixture = runtime(name);
  await expectBlocked(fixture, request({ rawBody: '{bad json' }));
  expect(fixture.fixtureClient).not.toHaveBeenCalled();
});
