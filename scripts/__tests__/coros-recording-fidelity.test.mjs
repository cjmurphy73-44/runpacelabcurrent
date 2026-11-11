// Real historical-sync handler + MCP transport/record extraction + FIT download,
// decoder, normalization and mapping. All fetches and SDK persistence are fixtures.
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { build } from 'esbuild';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { parseFitWithLaps } from '../../base44/shared/workoutParsers.ts';
import { MAX_FIT_INPUT_BYTES, MAX_INLINE_WORKOUT_BYTES } from '../../base44/shared/recordingStorage.ts';
import { createHash } from 'node:crypto';
import { isUsableTelemetry } from '../../base44/shared/streamValidity.ts';
import { syntheticFit1Hz } from './fixtures/syntheticFit.mjs';

const mcpUrl = 'https://mcpus.coros.com/mcp';
const fitUrl = 'https://synthetic-recordings.invalid/coros.fit';
const clone = value => JSON.parse(JSON.stringify(value));
const mapped = stream => stream;
let bundle;

beforeAll(async () => {
  const result = await build({
    entryPoints: [resolve('base44/functions/corosSync/entry.ts')],
    bundle: true, write: false, format: 'cjs', platform: 'node', target: 'es2022',
    plugins: [{
      name: 'offline-coros-boundaries',
      setup(builder) {
        builder.onResolve({ filter: /postWorkoutAI\.ts$/ }, args => ({ path: args.path, namespace: 'offline-effect' }));
        builder.onLoad({ filter: /.*/, namespace: 'offline-effect' }, () => ({ contents: 'export const runPostWorkoutEvaluation = () => { throw new Error("Unexpected coach invocation"); };' }));
        builder.onResolve({ filter: /^(npm:|base44:)/ }, args => ({ path: args.path, namespace: 'offline-package' }));
        builder.onLoad({ filter: /.*/, namespace: 'offline-package' }, args => {
          if (args.path.startsWith('npm:@base44/sdk@')) return { contents: 'export const createClientFromRequest = () => globalThis.fixtureClient;' };
          if (args.path === 'npm:fit-file-parser') return { contents: 'export default class FitParser { constructor() { throw new Error("Unexpected legacy decoder"); } }' };
          throw new Error(`Missing explicit fixture for ${args.path}`);
        });
      },
    }],
  });
  bundle = result.outputFiles[0].text;
});

function runtime(bytes, { records, fileMode = 'fit', fileModes = [], downloadBytes, downloadSequence, partialWriteOnce = false } = {}) {
  const decoded = parseFitWithLaps(bytes);
  const record = { date: '2026-01-01', sport: 'running', label_id: 'synthetic-recording', sport_type: 100,
    duration_seconds: decoded.summary.duration_seconds, distance_km: decoded.summary.distance_km,
    avg_heart_rate: 145, max_heart_rate: 154 };
  const rows = [];
  const bulkCreate = vi.fn(async payloads => {
    const toSave = partialWriteOnce && bulkCreate.mock.calls.length === 1 ? payloads.slice(0, 1) : payloads;
    const saved = clone(toSave).map((payload, index) => ({ id: `synthetic-workout-${rows.length + index}`, ...payload }));
    rows.push(...saved);
    if (partialWriteOnce && bulkCreate.mock.calls.length === 1) throw new Error('Synthetic partial write failure');
    return saved;
  });
  const invoke = vi.fn(async () => ({}));
  const athlete = { id: 'synthetic-athlete', created_by_id: 'synthetic-user', resting_hr: 60, max_heart_rate: 190 };
  const entities = {
    User: { get: vi.fn(async () => ({ id: 'synthetic-user', data: { athlete_profile_id: athlete.id } })) },
    AthleteProfile: { get: vi.fn(async () => athlete) },
    CorosConnection: {
      filter: vi.fn(async () => [{ id: 'synthetic-connection', access_token: 'synthetic-token', token_expires_at: '2099-01-01T00:00:00Z' }]),
      update: vi.fn(async () => ({})),
    },
    Subscription: { filter: vi.fn(async () => []) },
    WorkoutSession: {
      filter: vi.fn(async query => {
        expect(query.athlete_id).toBe(athlete.id);
        return rows.filter(row => query.date.$in.includes(row.date));
      }), bulkCreate,
    },
  };
  const client = { auth: { me: vi.fn(async () => ({ id: 'synthetic-user' })) }, asServiceRole: { entities, functions: { invoke } } };
  const unexpectedNetwork = [];
  const rpcCalls = [];
  const queuedFileModes = [...fileModes];
  let currentFileMode = fileMode;
  const network = vi.fn(async (url, options) => {
    if (url === fitUrl) {
      if (currentFileMode === 'network-failure') throw new TypeError('synthetic network failure');
      if (currentFileMode === 'http-failure') return new Response('Synthetic unavailable', { status: 503 });
      if (currentFileMode === 'http-not-found') return new Response('Synthetic missing', { status: 404 });
      return new Response(currentFileMode === 'malformed' ? new Uint8Array([1, 2, 3]) : (downloadSequence?.shift() || downloadBytes || bytes));
    }
    if (url !== mcpUrl) { unexpectedNetwork.push(String(url)); throw new Error('Unexpected destination'); }
    expect(options.headers.Authorization).toBe('Bearer synthetic-token');
    const rpc = JSON.parse(options.body);
    if (rpc.method !== 'initialize') expect(options.headers['Mcp-Session-Id']).toBe('synthetic-session');
    rpcCalls.push(rpc);
    const json = value => Response.json({ jsonrpc: '2.0', id: rpc.id, result: value }, { headers: { 'mcp-session-id': 'synthetic-session' } });
    if (rpc.method === 'initialize') return json({ capabilities: {} });
    if (rpc.method === 'notifications/initialized') return new Response(null, { status: 202 });
    if (rpc.method === 'tools/call' && rpc.params.name === 'querySportRecords') {
      return json({ content: [{ type: 'text', text: JSON.stringify(records || [record]) }] });
    }
    if (rpc.method === 'tools/call' && rpc.params.name === 'queryActivityFitFileDownloadUrls') {
      expect(rpc.params.arguments).toEqual({ labelId: record.label_id, sportType: 100 });
      currentFileMode = queuedFileModes.shift() || fileMode;
      if (currentFileMode === 'lookup-network-failure') throw new TypeError('synthetic lookup network failure');
      if (currentFileMode === 'lookup-http-failure') {
        return Response.json({ jsonrpc: '2.0', id: rpc.id, result: {} }, { status: 503, headers: { 'mcp-session-id': 'synthetic-session' } });
      }
      const text = currentFileMode === 'unavailable'
        ? 'No file available'
        : currentFileMode === 'unknown-response' ? 'No download result was returned' : fitUrl;
      return json({ content: [{ type: 'text', text }] });
    }
    unexpectedNetwork.push(rpc.method + ':' + rpc.params?.name);
    throw new Error('Unexpected RPC');
  });
  const module = { exports: {} };
  let handler;
  const log = { warn: vi.fn(), error: vi.fn(), log: vi.fn() };
  runInNewContext(bundle, {
    module, exports: module.exports, fixtureClient: client, fetch: network,
    Deno: { env: { get: key => ({ TPL_ENVIRONMENT: 'production', TPL_EXTERNAL_SYNC_ENABLED: 'true', COROS_MCP_CLIENT_ID: 'synthetic-client' })[key] }, serve: callback => { handler = callback; } },
    Request, Response, Headers, URL, URLSearchParams, TextEncoder, TextDecoder,
    AbortController, setTimeout, clearTimeout, crypto: globalThis.crypto, console: log,
  });
  return {
    decoded, record, rows, bulkCreate, invoke, rpcCalls, network, connectionUpdate: entities.CorosConnection.update,
    async sync() {
      const response = await handler(new Request('https://synthetic-runtime.invalid/functions/corosSync', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'sync_historical' }),
      }));
      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.success).toBe(true);
      expect(unexpectedNetwork).toEqual([]);
      return result;
    },
  };
}

async function recording(count, options = {}, runtimeOptions = {}) {
  const fixture = runtime(syntheticFit1Hz(count, options), runtimeOptions);
  const result = await fixture.sync();
  expect(result).toMatchObject({ imported: 1, records_found: 1, duplicates: 0, errors: 0 });
  expect(fixture.bulkCreate).toHaveBeenCalledTimes(1);
  expect(fixture.invoke).toHaveBeenCalledExactlyOnceWith('calculateDailyTRIMP', { athlete_id: 'synthetic-athlete', date: '2026-01-01' });
  return { ...fixture, result, persisted: clone(fixture.rows[0]) };
}

describe('COROS historical recording fidelity (synthetic, serialized SDK boundary)', () => {
  const cases = new Map();
  beforeAll(async () => {
    for (const count of [3599, 3600, 3601, 7201]) cases.set(count, await recording(count, { lapSeconds: 60 }));
    cases.set('power-only', await recording(180, { heartRate: false, zeroFirstPower: true, lapSeconds: 60 }));
    cases.set('no-physiology', await recording(180, { heartRate: false, power: false }));
    cases.set('hr-only', await recording(180, { power: false }));
    cases.set('gap', await recording(180, { pauseAt: 60, pauseSeconds: 15 }));
    cases.set('lap-cap', await recording(202, { lapSeconds: 1 }));
    cases.set('unavailable', await recording(180, {}, { fileMode: 'unavailable' }));
  });

  it.each([3599, 3600])('retains %i mapped samples, native units, timestamps and laps', count => {
    const { decoded, persisted } = cases.get(count);
    expect(decoded.stream).toHaveLength(count);
    expect(persisted.streams).toEqual(mapped(decoded.stream));
    expect(persisted.streams[0]).toMatchObject({ time: 0, distance: 0, altitude: 0, heart_rate: 135, speed: 3, cadence: 80 });
    expect(persisted.streams.at(-1)).toMatchObject({ time: count - 1, distance: (count - 1) * 3 });
    expect(persisted.laps).toEqual(decoded.laps);
    expect(persisted.laps.at(-1).start_time_offset_s + persisted.laps.at(-1).duration_s).toBe(count - 1);
    expect(persisted).toMatchObject({ source_format: 'fit', athlete_id: 'synthetic-athlete', created_by_id: 'synthetic-user', duration_seconds: count - 1, zone_method: 'stream' });
  });

  it.each([3601, 7201])('retains all %i samples instead of silently truncating the prefix', count => {
    const { decoded, persisted } = cases.get(count);
    expect(decoded.stream).toHaveLength(count);
    expect(persisted.streams).toEqual(mapped(decoded.stream));
    expect(persisted.streams.at(-1).time).toBe(count - 1);
    expect(persisted.duration_seconds).toBe(count - 1);
    expect(persisted.zone_seconds.reduce((a, b) => a + b, 0)).toBe(count - 1);
    expect(persisted.laps).toEqual(decoded.laps);
  });

  it('keeps timestamp gaps without inserting synthetic samples', () => {
    const { decoded, persisted } = cases.get('gap');
    expect(persisted.streams).toEqual(mapped(decoded.stream));
    expect(persisted.streams).toHaveLength(180);
    expect(persisted.streams[59].time).toBe(59);
    expect(persisted.streams[60].time).toBe(75);
    expect(persisted.duration_seconds).toBe(194);
  });

  it('keeps absent power missing when HR telemetry is available', () => {
    const { decoded, persisted } = cases.get('hr-only');
    expect(decoded.stream.every(point => point.power === null)).toBe(true);
    expect(persisted.streams).toHaveLength(180);
    expect(persisted).not.toHaveProperty('avg_power');
    expect(persisted.streams.every(point => point.heart_rate > 0)).toBe(true);
  });

  it('does not fabricate physiological streams/zones when both channels are missing', () => {
    const { decoded, persisted } = cases.get('no-physiology');
    expect(decoded.stream.every(point => point.heart_rate === null && point.power === null)).toBe(true);
    expect(persisted).not.toHaveProperty('streams');
    expect(persisted).toMatchObject({ source_format: 'webhook', zone_method: 'none', zone_seconds: [0, 0, 0, 0, 0] });
  });

  it('preserves native power including zero after serialization', () => {
    const { decoded, persisted } = cases.get('power-only');
    expect(decoded.stream[0]).toMatchObject({ heart_rate: null, power: 0 });
    expect(isUsableTelemetry(decoded.stream, 179)).toBe(true);
    expect(persisted.avg_power).toBe(decoded.summary.avg_power);
    expect(persisted.streams).toEqual(decoded.stream);
    expect(persisted.streams[0].power).toBe(0);
    expect(isUsableTelemetry(persisted.streams, 179)).toBe(true);
  });

  it('preserves all measured laps alongside the complete recording', () => {
    const { decoded, persisted } = cases.get('lap-cap');
    expect(decoded.laps).toHaveLength(201);
    expect(persisted.laps).toEqual(decoded.laps);
    expect(persisted.streams).toHaveLength(202);
  });

  it('allows summary-only import only for COROS explicit no-file response', () => {
    const { persisted, result } = cases.get('unavailable');
    expect(persisted).not.toHaveProperty('streams');
    expect(persisted).toMatchObject({ source_format: 'webhook', zone_method: 'none', zone_seconds: [0, 0, 0, 0, 0] });
    expect(result).toMatchObject({ imported: 1, errors: 0, recording_errors: [] });
  });

  it.each([
    ['http-failure', 'fit_download_http_error', true],
    ['http-not-found', 'fit_download_http_error', false],
    ['network-failure', 'fit_download_network_error', true],
    ['lookup-http-failure', 'fit_lookup_http_error', true],
    ['lookup-network-failure', 'fit_lookup_failed', true],
    ['malformed', 'fit_parse_failed', false],
    ['unknown-response', 'fit_url_missing', true],
  ])('does not save a summary after %s FIT failure', async (fileMode, code, retryable) => {
    const fixture = runtime(syntheticFit1Hz(180), { fileMode });
    const result = await fixture.sync();
    expect(result).toMatchObject({ imported: 0, errors: 1, recording_errors: [{ code, retryable }] });
    expect(fixture.bulkCreate).not.toHaveBeenCalled();
    expect(fixture.invoke).not.toHaveBeenCalled();
    expect(fixture.rows).toHaveLength(0);
    expect(fixture.connectionUpdate).toHaveBeenCalledWith('synthetic-connection', expect.objectContaining({
      last_error: expect.stringContaining(retryable ? '1 issue(s) can be retried' : '1 need attention'),
    }));
  });

  it('fails closed when an activity has no FIT lookup identifier', async () => {
    const base = runtime(syntheticFit1Hz(180));
    const fixture = runtime(syntheticFit1Hz(180), { records: [{ ...base.record, label_id: undefined }] });
    const result = await fixture.sync();
    expect(result).toMatchObject({ imported: 0, errors: 1, recording_errors: [{ code: 'fit_lookup_id_missing', retryable: false }] });
    expect(fixture.bulkCreate).not.toHaveBeenCalled();
  });

  it('retries a failed activity successfully without a duplicate or summary fallback', async () => {
    const fixture = runtime(syntheticFit1Hz(180), { fileModes: ['network-failure', 'fit'] });
    expect(await fixture.sync()).toMatchObject({ imported: 0, errors: 1, recording_errors: [{ retryable: true }] });
    expect(fixture.rows).toHaveLength(0);
    expect(await fixture.sync()).toMatchObject({ imported: 1, errors: 0, recording_errors: [] });
    expect(fixture.rows).toHaveLength(1);
    expect(fixture.rows[0].streams).toHaveLength(180);
  });

  it('avoids an extra write/file download for a sequential repeated identical activity', async () => {
    const fixture = runtime(syntheticFit1Hz(180));
    expect(await fixture.sync()).toMatchObject({ imported: 1, duplicates: 0 });
    expect(await fixture.sync()).toMatchObject({ imported: 0, duplicates: 1 });
    expect(fixture.rows).toHaveLength(1);
    expect(fixture.bulkCreate).toHaveBeenCalledTimes(1);
    expect(fixture.network.mock.calls.filter(([url]) => url === fitUrl)).toHaveLength(1);
  });

  it('deduplicates identical entries within one provider response', async () => {
    const base = runtime(syntheticFit1Hz(180));
    const fixture = runtime(syntheticFit1Hz(180), { records: [base.record, base.record] });
    expect(await fixture.sync()).toMatchObject({ records_found: 2, imported: 1, duplicates: 1 });
    expect(fixture.rows).toHaveLength(1);
  });

  it('records COROS source hash and complete decoded/stored counts without claiming raw archival', () => {
    const { persisted, decoded } = cases.get(7201);
    expect(persisted.recording_provenance).toMatchObject({
      source: 'coros_fit', retention: 'complete_decoded_inline_v1',
      source_sha256: createHash('sha256').update(syntheticFit1Hz(7201, { lapSeconds: 60 })).digest('hex'),
      original_file_retained: false, decoded_samples: 7201, stored_samples: 7201,
      decoded_laps: decoded.laps.length, stored_laps: persisted.laps.length,
      first_time_s: 0, last_time_s: 7200,
    });
    expect(persisted.recording_provenance.channels).toContain('power');
  });

  it.each(['decoded', 'download'])('rejects an over-budget %s recording without a partial write or recalculation', async kind => {
    const fixture = runtime(syntheticFit1Hz(kind === 'decoded' ? 12001 : 180),
      kind === 'download' ? { downloadBytes: new Uint8Array(MAX_FIT_INPUT_BYTES + 1) } : {});
    expect(await fixture.sync()).toMatchObject({ imported: 0, errors: 1, recording_errors: [{
      code: kind === 'decoded' ? 'recording_storage_limit' : 'recording_input_too_large', retryable: false,
    }] });
    expect(fixture.bulkCreate).not.toHaveBeenCalled();
    expect(fixture.invoke).not.toHaveBeenCalled();
    expect(fixture.rows).toHaveLength(0);
    expect(fixture.connectionUpdate).toHaveBeenCalledWith('synthetic-connection', expect.objectContaining({ last_error: expect.stringContaining('activities were skipped') }));
  });

  it('imports a valid sibling without saving or recalculating the rejected activity', async () => {
    const bytes = syntheticFit1Hz(180);
    const base = runtime(bytes);
    const fixture = runtime(bytes, {
      records: [base.record, { ...base.record, date: '2026-01-02' }],
      fileModes: ['http-failure', 'fit'],
    });
    expect(await fixture.sync()).toMatchObject({
      imported: 1, errors: 1, records_found: 2,
      recording_errors: [{ code: 'fit_download_http_error', retryable: true }],
    });
    expect(fixture.rows).toHaveLength(1);
    expect(fixture.rows[0].date).toBe('2026-01-02');
    expect(fixture.rows[0].streams).toHaveLength(180);
    expect(fixture.invoke).toHaveBeenCalledExactlyOnceWith('calculateDailyTRIMP', { athlete_id: 'synthetic-athlete', date: '2026-01-02' });
  });

  it('splits bulk writes by serialized bytes without losing valid long activities', async () => {
    const base = runtime(syntheticFit1Hz(7201));
    const records = [1, 2, 3].map(day => ({ ...base.record, date: `2026-01-0${day}` }));
    const fixture = runtime(syntheticFit1Hz(7201), { records });
    expect(await fixture.sync()).toMatchObject({ imported: 3, errors: 0 });
    expect(fixture.bulkCreate.mock.calls.length).toBeGreaterThan(1);
    for (const [batch] of fixture.bulkCreate.mock.calls) {
      expect(new TextEncoder().encode(JSON.stringify(batch)).byteLength).toBeLessThanOrEqual(MAX_INLINE_WORKOUT_BYTES);
    }
    expect(fixture.rows.map(row => row.streams.length)).toEqual([7201, 7201, 7201]);
  });

  it('reports confirmed partial bulk persistence and retries only the missing workout', async () => {
    const base = runtime(syntheticFit1Hz(180));
    const records = [1, 2].map(day => ({ ...base.record, date: `2026-01-0${day}` }));
    const fixture = runtime(syntheticFit1Hz(180), { records, partialWriteOnce: true });

    expect(await fixture.sync()).toMatchObject({
      imported: 1, errors: 1, records_found: 2, duplicates: 0,
      recording_errors: [{ date: '2026-01-02', code: 'workout_write_failed', retryable: true }],
    });
    expect(fixture.rows.map(row => row.date)).toEqual(['2026-01-01']);

    expect(await fixture.sync()).toMatchObject({ imported: 1, errors: 0, duplicates: 1, records_found: 2 });
    expect(fixture.rows.map(row => row.date)).toEqual(['2026-01-01', '2026-01-02']);
    expect(new Set(fixture.rows.map(row => row.date)).size).toBe(2);
  });

  // Explicit desired contracts: these remain defects, not accepted truncation behavior.
  it('preserves all samples in a two-hour recording', () => {
    expect(cases.get(7201).persisted.streams).toHaveLength(7201);
  });
  it('persists native per-sample power including a valid zero', () => {
    expect(cases.get('power-only').persisted.streams[0]).toHaveProperty('power', 0);
  });
  it('preserves all 201 measured laps', () => {
    expect(cases.get('lap-cap').persisted.laps).toHaveLength(201);
  });
  it('reports a failed FIT download rather than an error-free sync', async () => {
    const fixture = runtime(syntheticFit1Hz(180), { fileMode: 'http-failure' });
    expect(await fixture.sync()).toMatchObject({
      imported: 0, errors: 1,
      recording_errors: [{ code: 'fit_download_http_error', retryable: true, http_status: 503 }],
    });
  });
});
