// Execute the real handler, URL validation, FIT decoder and zone calculation.
// SDK persistence is a JSON-serialized in-memory fixture; no remote system is used.
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { build } from 'esbuild';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { createHash } from 'node:crypto';
import { MAX_FIT_INPUT_BYTES, MAX_INLINE_WORKOUT_BYTES } from '../../base44/shared/recordingStorage.ts';
import { parseFitWithLaps } from '../../base44/shared/workoutParsers.ts';
import { syntheticFit1Hz } from './fixtures/syntheticFit.mjs';

let bundle;
const fitUrl = 'https://synthetic-recordings.invalid/garmin.fit';
const secret = 'synthetic-webhook-secret';

beforeAll(async () => {
  const result = await build({
    entryPoints: [resolve('base44/functions/garminWebhook/entry.ts')],
    bundle: true, write: false, format: 'cjs', platform: 'node', target: 'es2022',
    plugins: [{
      name: 'isolated-webhook-fixtures',
      setup(builder) {
        builder.onResolve({ filter: /(?:postWorkoutAI|ctlRecalc)\.ts$/ }, args => ({ path: args.path, namespace: 'isolated-effect' }));
        builder.onLoad({ filter: /.*/, namespace: 'isolated-effect' }, args => ({
          contents: args.path.endsWith('ctlRecalc.ts')
            ? 'export const recomputeCTLATLTSB = (...args) => globalThis.fixtureRecalc(...args);'
            : 'export const runPostWorkoutEvaluation = (...args) => globalThis.fixtureCoach(...args);',
        }));
        builder.onResolve({ filter: /^(npm:|base44:)/ }, args => ({ path: args.path, namespace: 'isolated-package' }));
        builder.onLoad({ filter: /.*/, namespace: 'isolated-package' }, args => {
          if (args.path.startsWith('npm:@base44/sdk@')) return { contents: 'export const createClientFromRequest = () => globalThis.fixtureClient;' };
          if (args.path === 'base44:runtime') return { contents: 'export const waitUntil = promise => globalThis.fixtureWaitUntil(promise);' };
          // workoutIngest imports this legacy parser; garminWebhook must use the real
          // native parseFitWithLaps path instead. Fail loudly if it calls the fallback.
          if (args.path === 'npm:fit-file-parser') return { contents: 'export default class FitParser { constructor() { throw new Error("Unexpected legacy FIT parser"); } }' };
          throw new Error(`Missing explicit fixture for ${args.path}`);
        });
      },
    }],
  });
  bundle = result.outputFiles[0].text;
});

async function ingest(bytes, { expectedStatus = 200, fetchStatus = 200, networkFailure = false, withFit = true } = {}) {
  const writes = [];
  const create = vi.fn(async payload => {
    const serialized = JSON.parse(JSON.stringify(payload));
    writes.push(serialized);
    return { id: 'synthetic-workout', ...serialized };
  });
  const client = { asServiceRole: { entities: {
    GarminConnection: {
      filter: vi.fn(async () => [{ id: 'synthetic-connection', athlete_id: 'synthetic-athlete' }]),
      update: vi.fn(async () => ({})),
    },
    AthleteProfile: { get: vi.fn(async () => ({ id: 'synthetic-athlete', created_by_id: 'synthetic-owner', resting_hr: 60, max_heart_rate: 190 })) },
    WebhookEvent: { filter: vi.fn(async () => []), create: vi.fn(async () => ({})) },
    WorkoutSession: { filter: vi.fn(async () => []), create },
  } } };
  const network = vi.fn(async url => {
    if (url !== fitUrl) throw new Error('Unexpected network destination');
    if (networkFailure) throw new Error('Synthetic network failure');
    return new Response(bytes, { status: fetchStatus, headers: { 'content-type': 'application/octet-stream' } });
  });
  const recalc = vi.fn(async () => ({}));
  const coach = vi.fn(async () => ({}));
  const waitUntil = vi.fn();
  const module = { exports: {} };
  let handler;
  runInNewContext(bundle, {
    module, exports: module.exports, fixtureClient: client, fixtureRecalc: recalc,
    fixtureCoach: coach, fixtureWaitUntil: waitUntil, fetch: network,
    Deno: {
      // Explicit synthetic runtime flags also keep this fixture usable if the
      // guarded infrastructure entry is later reconciled. Never read process.env.
      env: { get: key => ({ GARMIN_WEBHOOK_SECRET: secret, TPL_ENVIRONMENT: 'production', TPL_EXTERNAL_SYNC_ENABLED: 'true' })[key] },
      serve: callback => { handler = callback; },
    },
    Request, Response, Headers, URL, URLSearchParams, TextEncoder, TextDecoder,
    crypto: globalThis.crypto, console,
  });
  const response = await handler(new Request('https://synthetic-runtime.invalid/functions/garminWebhook', {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-garmin-signature': secret },
    body: JSON.stringify({ user_id: 'synthetic-garmin-user', ...(withFit ? { fit_file_url: fitUrl } : {}), activity: { date: '2026-01-01', sport: 'running', duration_seconds: 180, avg_heart_rate: 145 } }),
  }));
  expect(response.status).toBe(expectedStatus);
  if (expectedStatus !== 200) {
    expect(create).not.toHaveBeenCalled();
    expect(client.asServiceRole.entities.WebhookEvent.create).not.toHaveBeenCalled();
    expect(client.asServiceRole.entities.GarminConnection.update).not.toHaveBeenCalled();
    expect(recalc).not.toHaveBeenCalled();
    expect(coach).not.toHaveBeenCalled();
    expect(waitUntil).not.toHaveBeenCalled();
    return await response.json();
  }
  expect(await response.json()).toEqual({ success: true, workout_session_id: 'synthetic-workout' });
  if (withFit) expect(network).toHaveBeenCalledExactlyOnceWith(fitUrl);
  else expect(network).not.toHaveBeenCalled();
  expect(create).toHaveBeenCalledTimes(1);
  expect(client.asServiceRole.entities.GarminConnection.filter).toHaveBeenCalledWith({ garmin_user_id: 'synthetic-garmin-user' });
  expect(recalc).toHaveBeenCalledExactlyOnceWith(client, 'synthetic-athlete');
  expect(coach).toHaveBeenCalledExactlyOnceWith(client, 'synthetic-workout', 'synthetic-athlete');
  expect(waitUntil).toHaveBeenCalledTimes(1);
  return writes[0];
}

describe('Garmin webhook complete decoded recording retention', () => {
  const cases = new Map();
  beforeAll(async () => {
    for (const count of [3599, 3600, 3601, 7201]) {
      const bytes = syntheticFit1Hz(count, { lapSeconds: 60 });
      const decoded = parseFitWithLaps(bytes);
      expect(decoded.stream).toHaveLength(count);
      cases.set(count, { bytes, decoded, persisted: await ingest(bytes) });
    }
  });

  it.each([3599, 3600, 3601, 7201])('retains all %i samples and laps with native values after serialization', count => {
    const { decoded, persisted } = cases.get(count);
    expect(persisted.streams).toEqual(decoded.stream);
    expect(persisted.laps).toEqual(decoded.laps);
    expect(persisted.streams).toHaveLength(count);
    expect(persisted.streams[0]).toMatchObject({ time: 0, distance: 0, altitude: 0, heart_rate: 135, power: 200 });
    expect(persisted.streams.at(-1)).toMatchObject({ time: count - 1, distance: (count - 1) * 3 });
    expect(persisted).toMatchObject({ athlete_id: 'synthetic-athlete', created_by_id: 'synthetic-owner', source_format: 'fit', duration_seconds: count - 1, zone_method: 'stream' });
    expect(persisted.zone_seconds.reduce((sum, value) => sum + value, 0)).toBe(count - 1);
  });

  it('records byte/hash/sample/channel provenance without pretending to archive the original file', () => {
    const { bytes, persisted } = cases.get(3601);
    expect(persisted.recording_provenance).toEqual({
      source: 'garmin_fit', retention: 'complete_decoded_inline_v1',
      source_sha256: createHash('sha256').update(bytes).digest('hex'),
      source_bytes: bytes.byteLength, original_file_retained: false,
      decoded_samples: 3601, stored_samples: 3601, decoded_laps: 60, stored_laps: 60,
      first_time_s: 0, last_time_s: 3600,
      channels: ['heart_rate', 'altitude', 'distance', 'cadence', 'speed', 'power'],
      inline_limit_bytes: MAX_INLINE_WORKOUT_BYTES,
    });
  });

  it('preserves power-only recordings, valid zero watts and missing HR', async () => {
    const bytes = syntheticFit1Hz(180, { heartRate: false, zeroFirstPower: true });
    const persisted = await ingest(bytes);
    expect(persisted.streams).toEqual(parseFitWithLaps(bytes).stream);
    expect(persisted.streams[0]).toMatchObject({ power: 0, heart_rate: null });
    expect(persisted.recording_provenance.channels).toContain('power');
    expect(persisted.recording_provenance.channels).not.toContain('heart_rate');
    expect(persisted.zone_method).toBe('none');
  });

  it('rejects an over-budget decoded payload instead of truncating or writing a partial session', async () => {
    expect(await ingest(syntheticFit1Hz(12001), { expectedStatus: 413 })).toMatchObject({ code: 'recording_storage_limit', retryable: false });
  });

  it('bounds the actual downloaded bytes even without Content-Length', async () => {
    expect(await ingest(new Uint8Array(MAX_FIT_INPUT_BYTES + 1), { expectedStatus: 413 })).toMatchObject({ code: 'recording_input_too_large', retryable: false });
  });

  it('reports download failure without a successful summary fallback', async () => {
    expect(await ingest(syntheticFit1Hz(180), { expectedStatus: 502, fetchStatus: 503 })).toMatchObject({ code: 'recording_download_failed', retryable: true });
  });

  it('reports network failure without echoing the provider URL or saving a summary', async () => {
    const error = await ingest(syntheticFit1Hz(180), { expectedStatus: 502, networkFailure: true });
    expect(error).toMatchObject({ code: 'recording_download_failed', retryable: true });
    expect(JSON.stringify(error)).not.toContain(fitUrl);
  });

  it('reports invalid original bytes instead of substituting summary telemetry', async () => {
    expect(await ingest(new Uint8Array([1, 2, 3]), { expectedStatus: 422 })).toMatchObject({ code: 'recording_parse_failed', retryable: false });
  });

  it('continues to accept legitimate summary-only pushes without fabricating a stream', async () => {
    const persisted = await ingest(new Uint8Array(), { withFit: false });
    expect(persisted.source_format).toBe('webhook');
    expect(persisted.zone_method).toBe('none');
    expect(persisted).not.toHaveProperty('streams');
    expect(persisted).not.toHaveProperty('recording_provenance');
  });
});
