// @vitest-environment node
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { webcrypto } from 'node:crypto';
import ts from 'typescript';
import { describe, expect, it, vi } from 'vitest';
import * as attempts from '../../../base44/shared/oauthAttempts';

const athlete = { id: 'synthetic-athlete', created_by_id: 'synthetic-owner' };

function harness(functionName, { configured = true, consumeResult, foreign = false } = {}) {
  const rows = new Map(); let count = 0;
  const attemptRepo = {
    create: vi.fn(async (data) => { const row = { ...data, id: `attempt-${++count}` }; rows.set(row.id, row); return row; }),
    get: vi.fn(async (id) => { if (!rows.has(id)) throw new Error('Not found'); return { ...rows.get(id) }; }),
    deleteMany: vi.fn(async (query) => {
      if (consumeResult) return consumeResult;
      const row = rows.get(query.id);
      const matched = row && Object.entries(query).every(([key, value]) => row[key] === value);
      if (matched) rows.delete(query.id);
      return { success: true, deleted: matched ? 1 : 0 };
    }),
  };
  const connection = { filter: vi.fn(async () => []), delete: vi.fn(), create: vi.fn(async () => ({ id: 'connection' })) };
  const client = { auth: { me: vi.fn(async () => ({ id: athlete.created_by_id })) }, asServiceRole: { entities: {
    OAuthAttempt: attemptRepo, AthleteProfile: { get: vi.fn(async () => ({ ...athlete })) },
    CorosConnection: connection, WearableConnection: connection,
  } } };
  const env = (key) => configured ? ({ COROS_MCP_CLIENT_ID: 'public-client-id', OURA_CLIENT_ID: 'public-oura-id', OURA_CLIENT_SECRET: 'synthetic-private-secret', COROS_REDIRECT_URI: 'https://synthetic.test/functions/corosSync' }[key] || '') : '';
  const network = vi.fn(async () => Response.json({ access_token: 'synthetic-provider-token', expires_in: 300 }));
  const modules = {
    'npm:@base44/sdk@0.8.31': { createClientFromRequest: () => client },
    '../../shared/oauth.ts': { env },
    '../../shared/oauthAttempts.ts': attempts,
    '../../shared/workoutIngest.ts': { getOwnedAthlete: async () => foreign ? { ...athlete, created_by_id: 'foreign-user' } : athlete },
    '../../shared/corosMcp.ts': { fetchWithTimeout: network },
    '../../shared/errorReport.ts': { reportError: vi.fn() },
  };
  let handler;
  const source = readFileSync(new URL(`../../../base44/functions/${functionName}/entry.ts`, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  runInNewContext(compiled, {
    exports: {}, URL, URLSearchParams, Request, Response, TextEncoder, TextDecoder, Uint8Array, crypto: webcrypto, btoa, atob,
    console: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
    fetch: network, Deno: { serve: (fn) => { handler = fn; } }, require: (path) => modules[path] || {},
  });
  const provider = functionName === 'corosSync' ? 'coros' : 'oura';
  const base = `https://synthetic.test/functions/${functionName}`;
  let browserCookie = '';
  const authorize = async () => {
    const res = await handler(new Request(base, { method: 'POST', body: JSON.stringify({ action: 'authorize', provider }) }));
    browserCookie = (res.headers.get('set-cookie') || '').split(';')[0];
    return res;
  };
  const callback = (state, code = 'synthetic-code', withCookie = true) => handler(new Request(base + '?' + new URLSearchParams({ provider, code, state }), { headers: withCookie ? { cookie: browserCookie } : {} }));
  return { authorize, callback, network, connection, attemptRepo, rows };
}

describe.each(['corosSync', 'wearableOAuthSync'])('%s actual request router', (functionName) => {
  it('authorizes, consumes once before exchange, rejects replay and writes one connection', async () => {
    const h = harness(functionName);
    const res = await h.authorize();
    expect(res.status).toBe(200);
    const url = new URL((await res.json()).authorize_url);
    const state = url.searchParams.get('state');
    expect(state).toMatch(/^attempt-1\.[A-Za-z0-9_-]{43}$/);
    expect(state).not.toContain(athlete.id);
    await h.callback(state);
    expect(h.attemptRepo.deleteMany).toHaveBeenCalledTimes(1);
    expect(h.network).toHaveBeenCalledTimes(1);
    expect(h.attemptRepo.deleteMany.mock.invocationCallOrder[0]).toBeLessThan(h.network.mock.invocationCallOrder[0]);
    expect(h.connection.create).toHaveBeenCalledTimes(1);
    expect(h.connection.create.mock.calls[0][0]).toMatchObject({ athlete_id: athlete.id, created_by_id: athlete.created_by_id });
    await h.callback(state);
    expect(h.network).toHaveBeenCalledTimes(1);
    expect(h.connection.create).toHaveBeenCalledTimes(1);
  });
  it.each(['missing', 'invalid', 'expired', 'owner', 'provider'])('rejects %s state before token exchange or connection writes', async (kind) => {
    const h = harness(functionName);
    const state = new URL((await (await h.authorize()).json()).authorize_url).searchParams.get('state');
    const row = h.rows.get('attempt-1');
    if (kind === 'expired') { row.issued_at = Date.now() - 700000; row.expires_at = row.issued_at + 600000; }
    if (kind === 'owner') row.owner_user_id = 'foreign-user';
    if (kind === 'provider') row.provider = 'different-provider';
    await h.callback(kind === 'missing' ? '' : kind === 'invalid' ? 'fake.invalid-state' : state);
    expect(h.network).not.toHaveBeenCalled();
    expect(h.connection.create).not.toHaveBeenCalled();
    expect(h.connection.delete).not.toHaveBeenCalled();
  });
  it('exchanges only once for simultaneous synthetic callbacks', async () => {
    const h = harness(functionName);
    const state = new URL((await (await h.authorize()).json()).authorize_url).searchParams.get('state');
    await Promise.all([h.callback(state), h.callback(state)]);
    expect(h.network).toHaveBeenCalledTimes(1);
    expect(h.connection.create).toHaveBeenCalledTimes(1);
  });
  it('denies Boolean-only consumption confirmation before any provider call', async () => {
    const h = harness(functionName, { consumeResult: { success: true } });
    const state = new URL((await (await h.authorize()).json()).authorize_url).searchParams.get('state');
    await h.callback(state);
    expect(h.network).not.toHaveBeenCalled();
    expect(h.connection.create).not.toHaveBeenCalled();
  });
  it('rejects a valid state presented without the initiating browser cookie', async () => {
    const h = harness(functionName);
    const response = await h.authorize();
    expect(response.headers.get('set-cookie')).toMatch(/Secure; HttpOnly; SameSite=Lax; Path=\//);
    expect(response.headers.get('cache-control')).toBe('no-store');
    const state = new URL((await response.json()).authorize_url).searchParams.get('state');
    await h.callback(state, 'synthetic-code', false);
    expect(h.network).not.toHaveBeenCalled();
    expect(h.connection.create).not.toHaveBeenCalled();
    expect(h.attemptRepo.deleteMany).not.toHaveBeenCalled();
  });
  it('does not create state for a self-linked foreign profile', async () => {
    const h = harness(functionName, { foreign: true });
    expect((await h.authorize()).status).toBeGreaterThanOrEqual(400);
    expect(h.attemptRepo.create).not.toHaveBeenCalled();
    expect(h.network).not.toHaveBeenCalled();
  });
  it('fails closed when provider configuration is absent', async () => {
    const h = harness(functionName, { configured: false });
    await h.authorize(); await h.callback('fake.' + 'x'.repeat(43));
    expect(h.attemptRepo.create).not.toHaveBeenCalled();
    expect(h.network).not.toHaveBeenCalled();
    expect(h.connection.create).not.toHaveBeenCalled();
  });
});

it('denies all ordinary client CRUD access to OAuth attempt records', () => {
  const schema = JSON.parse(readFileSync(new URL('../../../base44/entities/OAuthAttempt.jsonc', import.meta.url), 'utf8'));
  expect(schema.rls).toEqual({ create: false, read: false, update: false, delete: false });
  expect(schema.required).toContain('browser_binding_hash');
});
