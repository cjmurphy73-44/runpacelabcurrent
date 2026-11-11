// Offline integration coverage: actual bundled COROS webhook, FIT parser,
// recording budget, Base44 persistence and provenance. No athlete/provider calls.
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { build } from 'esbuild';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { createHash } from 'node:crypto';
import { syntheticFit1Hz } from './fixtures/syntheticFit.mjs';
import { MAX_FIT_INPUT_BYTES } from '../../base44/shared/recordingStorage.ts';

const fitUrl = 'https://synthetic-recordings.invalid/activity.fit';
let bundle;
beforeAll(async () => {
  const built = await build({
    entryPoints: [resolve('base44/functions/corosSync/entry.ts')],
    bundle: true, write: false, format: 'cjs', platform: 'node', target: 'es2022',
    plugins: [{
      name: 'offline-webhook-boundaries',
      setup(builder) {
        builder.onResolve({ filter: /postWorkoutAI\.ts$/ }, args => ({ path: args.path, namespace: 'offline-effect' }));
        builder.onLoad({ filter: /.*/, namespace: 'offline-effect' }, () => ({
          contents: 'export const runPostWorkoutEvaluation = () => { throw new Error("Unexpected coach invocation"); };',
        }));
        builder.onResolve({ filter: /^(npm:|base44:)/ }, args => ({ path: args.path, namespace: 'offline-package' }));
        builder.onLoad({ filter: /.*/, namespace: 'offline-package' }, args => {
          if (args.path.startsWith('npm:@base44/sdk@')) return { contents: 'export const createClientFromRequest = () => globalThis.fixtureClient;' };
          if (args.path === 'npm:fit-file-parser') return { contents: 'export default class FitParser { constructor() { throw new Error("Unexpected decoder"); } }' };
          throw new Error('Unmocked package: ' + args.path);
        });
      },
    }],
  });
  bundle = built.outputFiles[0].text;
});

function harness({ bytes = syntheticFit1Hz(180, { lapSeconds: 60 }), mode = 'ok', includeFit = true, signature = 'synthetic-webhook-secret' } = {}) {
  const rows = [];
  const create = vi.fn(async row => {
    const saved = JSON.parse(JSON.stringify(row));
    rows.push(saved);
    return { id: 'synthetic-session-1', ...saved };
  });
  const invoke = vi.fn(async () => ({}));
  const entities = {
    CorosConnection: {
      filter: vi.fn(async () => [{ id: 'connection-1', athlete_id: 'athlete-1', coros_user_id: 'coros-synthetic' }]),
      update: vi.fn(async () => ({})),
    },
    AthleteProfile: { get: vi.fn(async () => ({
      id: 'athlete-1', created_by_id: 'user-1', resting_hr: 60,
      max_heart_rate: 190, weight_kg: 70, age: 30,
    })) },
    WorkoutSession: {
      filter: vi.fn(async () => rows.map((row, i) => ({ id: String(i), ...row }))),
      create,
    },
  };
  const client = { asServiceRole: { entities, functions: { invoke } } };
  const network = vi.fn(async url => {
    if (url !== fitUrl) throw new Error('Unexpected network destination: ' + url);
    if (mode === 'network') throw new TypeError('Synthetic connection reset');
    if (mode === 'http') return new Response('Unavailable', { status: 503 });
    if (mode === 'malformed') return new Response(new Uint8Array([1, 2, 3]));
    return new Response(bytes);
  });
  const module = { exports: {} };
  let handler;
  runInNewContext(bundle, {
    module, exports: module.exports, fixtureClient: client, fetch: network,
    Deno: { env: { get: key => ({ COROS_WEBHOOK_SECRET: 'synthetic-webhook-secret' })[key] }, serve: callback => { handler = callback; } },
    Request, Response, Headers, URL, URLSearchParams, TextEncoder, TextDecoder,
    AbortController, setTimeout, clearTimeout, crypto: globalThis.crypto,
    console: { error: vi.fn(), warn: vi.fn(), log: vi.fn() },
  });
  const payload = {
    action: 'webhook', coros_user_id: 'coros-synthetic',
    activity: {
      date: '2026-01-01', sport: 'running', duration_seconds: 179,
      distance_km: 0.54, avg_heart_rate: 145,
      ...(includeFit ? { fit_file_url: fitUrl } : {}),
    },
  };
  return {
    rows, create, invoke, network,
    async send() {
      const response = await handler(new Request('https://synthetic-runtime.invalid/functions/corosSync', {
        method: 'POST', headers: { 'content-type': 'application/json', 'x-coros-signature': signature },
        body: JSON.stringify(payload),
      }));
      return { status: response.status, body: await response.json() };
    },
  };
}

describe('COROS webhook original FIT integration (offline synthetic)', () => {
  it.each([180, 3601, 7201])('preserves all %i samples, measured channels, laps and SHA-256', async count => {
    const bytes = syntheticFit1Hz(count, { lapSeconds: 60, zeroFirstPower: true });
    const h = harness({ bytes });
    const response = await h.send();
    expect(response).toMatchObject({ status: 200, body: { success: true } });
    expect(h.rows).toHaveLength(1);
    const saved = h.rows[0];
    expect(saved.streams).toHaveLength(count);
    expect(saved.streams[0]).toMatchObject({ time: 0, heart_rate: 135, power: 0, distance: 0, cadence: 80 });
    expect(saved.streams.at(-1).time).toBe(count - 1);
    expect(saved.streams.at(-1).distance).toBe((count - 1) * 3);
    expect(saved.laps.length).toBeGreaterThan(0);
    expect(saved.recording_provenance).toMatchObject({
      source: 'coros_fit', retention: 'complete_decoded_inline_v1',
      decoded_samples: count, stored_samples: count, original_file_retained: false,
      decoded_laps: saved.laps.length, stored_laps: saved.laps.length,
      source_sha256: createHash('sha256').update(bytes).digest('hex'),
    });
    expect(saved.zone_method).toBe('stream');
  });

  it('preserves real timestamp gaps without filling in fabricated samples', async () => {
    const h = harness({ bytes: syntheticFit1Hz(180, { pauseAt: 60, pauseSeconds: 15 }) });
    expect((await h.send()).status).toBe(200);
    expect(h.rows[0].streams).toHaveLength(180);
    expect(h.rows[0].streams[59].time).toBe(59);
    expect(h.rows[0].streams[60].time).toBe(75);
  });

  it.each([
    ['http', 'recording_download_failed', 502],
    ['network', 'recording_download_failed', 502],
    ['malformed', 'recording_parse_failed', 422],
  ])('does not silently persist a summary after %s FIT failure', async (mode, code, status) => {
    const h = harness({ mode });
    expect(await h.send()).toMatchObject({ status, body: { code } });
    expect(h.create).not.toHaveBeenCalled();
    expect(h.invoke).not.toHaveBeenCalled();
  });

  it('rejects over-budget original FIT before persisting any workout', async () => {
    const h = harness({ bytes: new Uint8Array(MAX_FIT_INPUT_BYTES + 1) });
    expect(await h.send()).toMatchObject({ status: 413, body: { code: 'recording_input_too_large' } });
    expect(h.create).not.toHaveBeenCalled();
  });

  it('permits summary-only when COROS supplies no recording URL', async () => {
    const h = harness({ includeFit: false });
    expect(await h.send()).toMatchObject({ status: 200, body: { success: true } });
    expect(h.rows).toHaveLength(1);
    expect(h.rows[0].streams).toBeUndefined();
    expect(h.rows[0].recording_provenance).toBeUndefined();
  });

  it('rejects unauthenticated webhooks without a network call or write', async () => {
    const h = harness({ signature: 'incorrect' });
    expect(await h.send()).toMatchObject({ status: 401 });
    expect(h.create).not.toHaveBeenCalled();
    expect(h.network).not.toHaveBeenCalled();
  });

  it('deduplicates repeated original webhook deliveries', async () => {
    const h = harness();
    expect(await h.send()).toMatchObject({ status: 200, body: { success: true } });
    expect(await h.send()).toMatchObject({ status: 200, body: { success: true, skipped: true } });
    expect(h.create).toHaveBeenCalledTimes(1);
  });
});
