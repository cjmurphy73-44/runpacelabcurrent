// base44/functions/wearableOAuthSync/entry.ts
// Generic OAuth2 recovery-sync driver for free wearable providers (Oura, Whoop,
// Withings, Polar, Fitbit). One function, one connection entity (WearableConnection),
// one normalizer per provider in shared/recoveryIngest.ts. Each provider needs its
// own registered developer app + CLIENT_ID/CLIENT_SECRET app secrets (see set_secrets).
//
// Endpoints below are best-effort from public provider docs; if a provider changes a
// host path, correct it here. OAuth flow (HMAC-signed state, PKCE optional) reuses
// shared/oauth.ts; recovery ingest reuses shared/recoveryIngest.ts.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { getOwnedAthlete } from '../../shared/workoutIngest.ts';
import { env, hmacBase64Url } from '../../shared/oauth.ts';
import {
  ingestRecovery,
  normalizeOuraRecovery,
  normalizeWhoopRecovery,
  normalizePolarRecovery,
  normalizeFitbitRecovery,
  normalizeWithingsRecovery,
  normalizeSuuntoRecovery,
} from '../../shared/recoveryIngest.ts';

type ProviderKey = 'oura' | 'whoop' | 'withings' | 'polar' | 'fitbit' | 'suunto';

interface ProviderConfig {
  authorize_url: string;
  token_url: string;
  default_scopes: string;
  token_auth: 'basic' | 'body';
  client_id_env: string;
  client_secret_env: string;
  // fetch recovery docs for a date range; returns provider-native objects to merge
  fetchRecovery: (token: string, startDate: string, endDate: string) => Promise<any[]>;
  // normalize a merged provider-native object into NormalizedRecovery
  normalize: (doc: any) => any | null;
}

const PROVIDERS: Record<ProviderKey, ProviderConfig> = {
  oura: {
    authorize_url: 'https://cloud.oura.com/oauth/authorize',
    token_url: 'https://api.ouraring.com/v2/oauth/token',
    default_scopes: 'email personal daily',
    token_auth: 'body',
    client_id_env: 'OURA_CLIENT_ID',
    client_secret_env: 'OURA_CLIENT_SECRET',
    fetchRecovery: async (token, start, end) => {
      const base = 'https://api.ouraring.com/v2/usercollection';
      const get = async (p: string) => (await fetchJson(token, `${base}/${p}`)).data || [];
      const [hrv, sleep, readiness, activity] = await Promise.all([
        get(`daily_hrv?start_date=${start}&end_date=${end}`),
        get(`daily_sleep?start_date=${start}&end_date=${end}`),
        get(`daily_readiness?start_date=${start}&end_date=${end}`),
        get(`daily_activity?start_date=${start}&end_date=${end}`).catch(() => []),
      ]);
      const byDate: Record<string, any> = {};
      for (const d of hrv) byDate[d.day || d.summary_date] = { hrvDoc: d };
      for (const d of sleep) (byDate[d.day || d.summary_date] ||= {}).sleepDoc = d;
      for (const d of readiness) (byDate[d.day || d.summary_date] ||= {}).readinessDoc = d;
      for (const d of activity) (byDate[d.day || d.summary_date] ||= {}).activityDoc = d;
      return Object.values(byDate);
    },
    normalize: (doc) => normalizeOuraRecovery(doc.hrvDoc, doc.sleepDoc, doc.readinessDoc, doc.activityDoc),
  },
  whoop: {
    authorize_url: 'https://api.bedrock.whoop.com/v1/oauth/authorize',
    token_url: 'https://api.bedrock.whoop.com/v1/oauth/token',
    default_scopes: 'read:recovery read:sleep read:basic',
    token_auth: 'body',
    client_id_env: 'WHOOP_CLIENT_ID',
    client_secret_env: 'WHOOP_CLIENT_SECRET',
    fetchRecovery: async (token) => {
      const res = await fetchJson(token, 'https://api.bedrock.whoop.com/v1/recovery/cycle?limit=14');
      const items = res.data?.records || res.data || [];
      return Array.isArray(items) ? items : [];
    },
    normalize: (rec) => normalizeWhoopRecovery(rec),
  },
  withings: {
    authorize_url: 'https://account.withings.com/oauth2/authorize',
    token_url: 'https://wbsapi.withings.net/v2/oauth2',
    default_scopes: 'user.info user.metrics user.activity user.sleep',
    token_auth: 'body',
    client_id_env: 'WITHINGS_CLIENT_ID',
    client_secret_env: 'WITHINGS_CLIENT_SECRET',
    fetchRecovery: async (token) => {
      const base = 'https://wbsapi.withings.net/v2';
      const [hrv, sleep] = await Promise.all([
        fetchJson(token, `${base}/heart?action=getum&startdatemode=hrv`).catch(() => ({ data: { body: { series: [] } } })),
        fetchJson(token, `${base}/sleep?action=getsummary`).catch(() => ({ data: { body: { series: [] } } })),
      ]);
      const hrvSeries: any[] = hrv?.data?.body?.series || [];
      const sleepSeries: any[] = sleep?.data?.body?.series || [];
      const byDate: Record<string, any> = {};
      for (const s of hrvSeries) {
        const date = (s.timestamp ? new Date(s.timestamp * 1000).toISOString().slice(0, 10) : s.date);
        byDate[date] ||= { date, hrvMs: Number(s.hrv ?? s.rmssd ?? 0) || null };
      }
      for (const s of sleepSeries) {
        const date = (s.startdate ? new Date(s.startdate * 1000).toISOString().slice(0, 10) : s.date);
        (byDate[date] ||= { date }).sleepScore = Number(s.sleep_score ?? 0) || null;
        (byDate[date] as any).sleepHours = s.data?.total_sleep_time ? Number(s.data.total_sleep_time) / 3600 : null;
      }
      return Object.values(byDate);
    },
    normalize: (doc) => normalizeWithingsRecovery(doc.date, doc.hrvMs, doc.sleepScore, doc.sleepHours, doc.rhr),
  },
  polar: {
    authorize_url: 'https://flow.polar.com/oauth2/authorization',
    token_url: 'https://polarremote.com/oauth2/api/token',
    default_scopes: '',
    token_auth: 'body',
    client_id_env: 'POLAR_CLIENT_ID',
    client_secret_env: 'POLAR_CLIENT_SECRET',
    fetchRecovery: async (token, start) => {
      const base = 'https://www.polaraccesslink.com/v3';
      const from = start.replace(/-/g, '');
      const [recharge, sleep] = await Promise.all([
        fetchJson(token, `${base}/users/nightly-recharge?from=${from}`).catch(() => ({})),
        fetchJson(token, `${base}/users/sleep?from=${from}`).catch(() => ({})),
      ]);
      const rItems: any[] = recharge?.data?.recharges || recharge?.nightly_recharge || [];
      const sItems: any[] = sleep?.data?.nights || sleep?.sleeps || [];
      const byDate: Record<string, any> = {};
      for (const r of rItems) byDate[r.date] = { recharge: r };
      for (const s of sItems) (byDate[s.date] ||= { date: s.date }).sleep = s;
      return Object.values(byDate);
    },
    normalize: (doc) => normalizePolarRecovery(doc.recharge, doc.sleep),
  },
  fitbit: {
    authorize_url: 'https://www.fitbit.com/oauth2/authorize',
    token_url: 'https://api.fitbit.com/oauth2/token',
    default_scopes: 'heartrate sleep profile',
    token_auth: 'basic',
    client_id_env: 'FITBIT_CLIENT_ID',
    client_secret_env: 'FITBIT_CLIENT_SECRET',
    fetchRecovery: async (token, start) => {
      const base = 'https://api.fitbit.net/1/user/-';
      const days: string[] = [];
      const d = new Date(start);
      for (let i = 0; i < 14; i++) { days.push(d.toISOString().slice(0, 10)); d.setDate(d.getDate() + 1); }
      const out: any[] = [];
      for (const date of days) {
        const [hrv, sleep, profile] = await Promise.all([
          fetchJson(token, `${base}/hrv/date/${date}.json`).catch(() => null),
          fetchJson(token, `${base}/sleep/date/${date}.json`).catch(() => null),
          fetchJson(token, `${base}/profile.json`).catch(() => null),
        ]);
        out.push({ date, hrvDoc: hrv, sleepDoc: sleep, rhr: Number(profile?.data?.user?.restingHeartRate ?? 0) || null });
      }
      return out;
    },
    normalize: (doc) => normalizeFitbitRecovery(doc.date, doc.hrvDoc, doc.sleepDoc, doc.rhr),
  },
  suunto: {
    authorize_url: 'https://suunto.com/oauth/authorize',
    token_url: 'https://suunto.com/oauth/token',
    default_scopes: 'read',
    token_auth: 'body',
    client_id_env: 'SUUNTO_CLIENT_ID',
    client_secret_env: 'SUUNTO_CLIENT_SECRET',
    fetchRecovery: async (token, start) => {
      const res = await fetchJson(token, `https://cloudapi-oauth.suunto.com/v2/daily-sleep?since=${start}`).catch(() => ({}));
      const items: any[] = res?.data?.days || res?.data || [];
      return Array.isArray(items) ? items : [];
    },
    normalize: (doc) => normalizeSuuntoRecovery(doc),
  },
};

// ---- helpers ----

function selfUrl(req: Request): string {
  const url = new URL(req.url);
  return `${url.origin}${url.pathname}`;
}

async function fetchJson(token: string, url: string): Promise<any> {
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
  const text = await r.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* non-JSON */ }
  if (!r.ok) throw new Error(`${url} → ${r.status}: ${text.slice(0, 200)}`);
  return json || {};
}

async function refreshIfNeeded(conn: any, base44: any): Promise<string> {
  if (!conn.token_expires_at || new Date(conn.token_expires_at).getTime() > Date.now() + 60000) return conn.access_token;
  if (!conn.refresh_token) throw new Error('Access token expired and no refresh token stored — reconnect.');
  const cfg = PROVIDERS[conn.provider as ProviderKey];
  const body = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: conn.refresh_token, ...(cfg.client_id_env ? { client_id: env(cfg.client_id_env) } : {}) });
  const headers: Record<string, string> = { 'Content-Type': 'application/x-www-form-urlencoded' };
  if (cfg.token_auth === 'basic') {
    headers['Authorization'] = 'Basic ' + btoa(`${env(cfg.client_id_env)}:${env(cfg.client_secret_env)}`);
  } else {
    body.set('client_secret', env(cfg.client_secret_env));
  }
  const r = await fetch(cfg.token_url, { method: 'POST', headers, body });
  const tok = await r.json();
  if (!r.ok) throw new Error(`Token refresh failed: ${tok.error || r.status}`);
  await base44.asServiceRole.entities.WearableConnection.update(conn.id, {
    access_token: tok.access_token,
    refresh_token: tok.refresh_token || conn.refresh_token,
    token_expires_at: new Date(Date.now() + (tok.expires_in || 3600) * 1000).toISOString(),
  });
  return tok.access_token;
}

// ---- action handlers ----

async function handleAuthorize(req: Request, base44: any) {
  const body = await req.json().catch(() => ({}));
  const provider = (body.provider || '') as ProviderKey;
  const cfg = PROVIDERS[provider];
  if (!cfg) return Response.json({ error: `Unsupported provider: ${provider}` }, { status: 400 });
  if (!env(cfg.client_id_env) || !env(cfg.client_secret_env)) {
    return Response.json({ error: `${provider} is not configured yet. Add ${cfg.client_id_env} and ${cfg.client_secret_env} as app secrets, then retry.` }, { status: 503 });
  }
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const athlete = await getOwnedAthlete(base44, user.id);
  if (!athlete) return Response.json({ error: 'No athlete profile found' }, { status: 404 });

  const state = `${athlete.id}.${await hmacBase64Url(athlete.id, env(cfg.client_secret_env) || 'wearable-default-secret')}`;
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: env(cfg.client_id_env),
    redirect_uri: `${selfUrl(req)}?provider=${provider}`,
    state,
    scope: cfg.default_scopes,
  });
  return Response.json({ authorize_url: `${cfg.authorize_url}?${params.toString()}` });
}

async function handleOAuthCallback(req: Request, base44: any) {
  const u = new URL(req.url);
  const provider = (u.searchParams.get('provider') || '') as ProviderKey;
  const cfg = PROVIDERS[provider];
  const code = u.searchParams.get('code');
  const state = u.searchParams.get('state') || '';
  if (!cfg || !code) return Response.json({ error: 'Invalid callback (missing provider or code)' }, { status: 400 });
  const [athleteId, sig] = state.split('.');
  if (!athleteId || !sig || (await hmacBase64Url(athleteId, env(cfg.client_secret_env) || 'wearable-default-secret')) !== sig) {
    return Response.json({ error: 'Invalid state' }, { status: 400 });
  }
  const athlete = await base44.asServiceRole.entities.AthleteProfile.get(athleteId).catch(() => null);
  if (!athlete) return Response.json({ error: 'Athlete profile not found' }, { status: 404 });

  const body = new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: `${selfUrl(req)}?provider=${provider}` });
  const headers: Record<string, string> = { 'Content-Type': 'application/x-www-form-urlencoded' };
  if (cfg.token_auth === 'basic') {
    headers['Authorization'] = 'Basic ' + btoa(`${env(cfg.client_id_env)}:${env(cfg.client_secret_env)}`);
  } else {
    body.set('client_id', env(cfg.client_id_env));
    body.set('client_secret', env(cfg.client_secret_env));
  }
  const tokenRes = await fetch(cfg.token_url, { method: 'POST', headers, body });
  const tok = await tokenRes.json();
  if (!tokenRes.ok) return Response.json({ error: `Token exchange failed: ${tokenRes.status}`, details: tok }, { status: 502 });

  const now = new Date();
  const existing = await base44.asServiceRole.entities.WearableConnection.filter({ athlete_id: athleteId, provider });
  for (const c of existing) await base44.asServiceRole.entities.WearableConnection.delete(c.id);
  await base44.asServiceRole.entities.WearableConnection.create({
    athlete_id: athleteId,
    created_by_id: athlete.created_by_id,
    provider,
    provider_user_id: tok.user_id || tok.athlete_id || null,
    access_token: tok.access_token,
    refresh_token: tok.refresh_token || null,
    token_expires_at: new Date(now.getTime() + (tok.expires_in || 3600) * 1000).toISOString(),
    scopes: cfg.default_scopes,
    status: 'connected',
    connected_at: now.toISOString(),
  });
  const html = `<!doctype html><meta http-equiv="refresh" content="2;url=${u.origin}/settings"><body style="font-family:system-ui;padding:3rem"><h2>${provider} connected</h2><p>Redirecting to your settings…</p></body>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html' } });
}

async function handleStatus(base44: any, provider: ProviderKey) {
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const athlete = await getOwnedAthlete(base44, user.id);
  if (!athlete) return Response.json({ connected: false });
  const conns = await base44.asServiceRole.entities.WearableConnection.filter({ athlete_id: athlete.id, provider });
  const conn = conns[0];
  if (!conn) return Response.json({ connected: false });
  return Response.json({
    connected: true,
    provider: conn.provider,
    last_sync_at: conn.last_sync_at,
    last_error: conn.last_error || null,
  });
}

async function handleSync(base44: any, provider: ProviderKey) {
  const cfg = PROVIDERS[provider];
  if (!cfg) return Response.json({ error: `Unsupported provider: ${provider}` }, { status: 400 });
  if (!env(cfg.client_id_env) || !env(cfg.client_secret_env)) {
    return Response.json({ error: `${provider} is not configured yet. Add ${cfg.client_id_env} and ${cfg.client_secret_env} as app secrets, then retry.` }, { status: 503 });
  }
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const athlete = await getOwnedAthlete(base44, user.id);
  if (!athlete) return Response.json({ error: 'No athlete profile found' }, { status: 404 });
  const conns = await base44.asServiceRole.entities.WearableConnection.filter({ athlete_id: athlete.id, provider });
  const conn = conns[0];
  if (!conn || !conn.access_token) return Response.json({ error: `${provider} account not connected` }, { status: 409 });

  let token: string;
  try { token = await refreshIfNeeded(conn, base44); }
  catch (e: any) {
    await base44.asServiceRole.entities.WearableConnection.update(conn.id, { last_error: e.message });
    return Response.json({ error: e.message }, { status: 502 });
  }

  const end = new Date().toISOString().slice(0, 10);
  const start = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10);
  let docs: any[] = [];
  let fetchError: string | null = null;
  try { docs = await cfg.fetchRecovery(token, start, end); }
  catch (e: any) { fetchError = e.message; }

  const history = await base44.asServiceRole.entities.DailyMetrics.filter({ athlete_id: athlete.id }, '-date', 30);
  let ingested = 0, errors = 0;
  for (const doc of docs) {
    try {
      const normalized = cfg.normalize(doc);
      if (!normalized) continue;
      const hasAny = normalized.hrv ?? normalized.sleep_score ?? normalized.resting_hr ?? normalized.sleep_duration_hours ?? normalized.provider_readiness_score ?? normalized.stress_score;
      if (hasAny == null) continue;
      await ingestRecovery(base44, athlete.id, normalized, provider, history);
      ingested++;
    } catch { errors++; }
  }
  await base44.asServiceRole.entities.WearableConnection.update(conn.id, {
    last_sync_at: new Date().toISOString(),
    last_error: fetchError && ingested === 0 ? fetchError : '',
  });
  return Response.json({ success: true, imported: ingested, errors, dates_found: docs.length, fetchError });
}

async function handleDisconnect(base44: any, provider: ProviderKey) {
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const athlete = await getOwnedAthlete(base44, user.id);
  if (!athlete) return Response.json({ success: true });
  const conns = await base44.asServiceRole.entities.WearableConnection.filter({ athlete_id: athlete.id, provider });
  for (const c of conns) await base44.asServiceRole.entities.WearableConnection.delete(c.id);
  return Response.json({ success: true });
}

// ---- router ----

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const u = new URL(req.url);

    // OAuth redirect landing: ?code=...&state=...&provider=...
    if (u.searchParams.get('code') && u.searchParams.get('state') && u.searchParams.get('provider')) {
      return await handleOAuthCallback(req, base44);
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action || u.searchParams.get('action');
    const provider = (body.provider || u.searchParams.get('provider') || '') as ProviderKey;
    if (!PROVIDERS[provider]) return Response.json({ error: `Unknown provider: ${provider}` }, { status: 400 });

    if (action === 'authorize') return await handleAuthorize(req, base44);
    if (action === 'status') return await handleStatus(base44, provider);
    if (action === 'sync') return await handleSync(base44, provider);
    if (action === 'disconnect') return await handleDisconnect(base44, provider);
    return Response.json({ error: `Unknown action: ${action || '(none)'}` }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});