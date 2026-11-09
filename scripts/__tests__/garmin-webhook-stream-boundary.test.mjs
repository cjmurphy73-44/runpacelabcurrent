// Execute the real handler, URL validation, FIT decoder and zone calculation.
// SDK persistence is a JSON-serialized in-memory fixture; no remote system is used.
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { build } from 'esbuild';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
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

async function ingest(bytes) {
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
    return new Response(bytes, { headers: { 'content-type': 'application/octet-stream' } });
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
    body: JSON.stringify({ user_id: 'synthetic-garmin-user', fit_file_url: fitUrl, activity: { date: '2026-01-01', sport: 'running' } }),
  }));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ success: true, workout_session_id: 'synthetic-workout' });
  expect(network).toHaveBeenCalledExactlyOnceWith(fitUrl);
  expect(create).toHaveBeenCalledTimes(1);
  expect(client.asServiceRole.entities.GarminConnection.filter).toHaveBeenCalledWith({ garmin_user_id: 'synthetic-garmin-user' });
  expect(recalc).toHaveBeenCalledExactlyOnceWith(client, 'synthetic-athlete');
  expect(coach).toHaveBeenCalledExactlyOnceWith(client, 'synthetic-workout', 'synthetic-athlete');
  expect(waitUntil).toHaveBeenCalledTimes(1);
  return writes[0];
}

const mappedStream = stream => stream.map(({ time, heart_rate, altitude, distance, cadence, speed }) => ({ time, heart_rate, altitude, distance, cadence, speed }));

describe('Garmin webhook FIT stream storage boundary (offline characterization)', () => {
  const cases = new Map();
  beforeAll(async () => {
    for (const count of [3599, 3600, 3601]) {
      const bytes = syntheticFit1Hz(count);
      const decoded = parseFitWithLaps(bytes);
      expect(decoded.stream).toHaveLength(count);
      expect(decoded.stream[0]).toMatchObject({ time: 0, distance: 0, altitude: 0, power: 200 });
      expect(decoded.stream[count - 1]).toMatchObject({
        time: count - 1, distance: (count - 1) * 3,
        heart_rate: 135 + (count - 1) % 20, cadence: 80 + (count - 1) % 5,
        speed: (3000 + (count - 1) % 10) / 1000, power: 200 + (count - 1) % 20,
      });
      cases.set(count, { decoded, persisted: await ingest(bytes) });
    }
  });

  it.each([3599, 3600])('preserves every currently mapped sample and native value for %i records', count => {
    const { decoded, persisted } = cases.get(count);
    expect(persisted.streams).toEqual(mappedStream(decoded.stream));
    expect(persisted.streams).toHaveLength(count);
    expect(persisted).toMatchObject({ athlete_id: 'synthetic-athlete', created_by_id: 'synthetic-owner', source_format: 'fit', duration_seconds: count - 1, zone_method: 'stream' });
  });

  it('reproduces complete stream omission at 3601 records despite successful decoding and response', () => {
    const { decoded, persisted } = cases.get(3601);
    expect(decoded.stream).toHaveLength(3601);
    expect(persisted).not.toHaveProperty('streams');
    expect(persisted).toMatchObject({ source_format: 'fit', duration_seconds: 3600, zone_method: 'stream' });
    expect(persisted.zone_seconds.reduce((sum, value) => sum + value, 0)).toBe(3600);
  });

  // Deliberate expected failure: the defect stays visible without treating the
  // current omission as accepted product behavior. A retention fix must remove
  // this .fails marker AND update the characterization above.
  it.fails('KNOWN DEFECT: retains all 3601 decoded samples in the serialized workout', () => {
    expect(cases.get(3601).persisted.streams).toEqual(mappedStream(cases.get(3601).decoded.stream));
  });
});
