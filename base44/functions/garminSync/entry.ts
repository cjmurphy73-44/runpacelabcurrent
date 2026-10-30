import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { VALID_SPORTS, calcTrimp, normalizeSport, getOwnedAthlete } from '../../shared/workoutIngest.ts';
import { env, hmacBase64Url } from '../../shared/oauth.ts';
import { normalizeGarminRecovery, ingestRecovery } from '../../shared/recoveryIngest.ts';
import { getSyncLookbackDays } from '../../shared/syncLookback.ts';

// Garmin's OAuth 2.0 endpoints are NOT on the data API host. The consent screen is
// served by connect.garmin.com and tokens by diauth.garmin.com. Building the authorize
// URL by appending "/oauth2/authorize" to the data API base sent the browser to
// Garmin's gateway with a path no proxy serves, returning:
//   "Unable to identify proxy for host: apis-secure and url: /oauth2/authorize".
const DEFAULT_AUTHORIZE_URL = 'https://connect.garmin.com/oauth2Confirm';
const DEFAULT_TOKEN_URL = 'https://diauth.garmin.com/di-oauth2-service/oauth/token';
// Public URL of this function — the redirect_uri registered with Garmin. req.url inside
// the runtime is the internal dispatcher address, which Garmin can never bounce back to.
const DEFAULT_REDIRECT_URI = 'https://trainpacelab.base44.app/functions/garminSync';

function requireConfig() {
  const clientId = env('GARMIN_CLIENT_ID');
  const clientSecret = env('GARMIN_CLIENT_SECRET');
  const apiBase = env('GARMIN_API_BASE');
  return {
    clientId,
    clientSecret,
    apiBase,
    // Explicit, independently overridable endpoints — never derived from the data API base.
    authorizeUrl: env('GARMIN_AUTHORIZE_URL') || DEFAULT_AUTHORIZE_URL,
    tokenUrl: env('GARMIN_TOKEN_URL') || DEFAULT_TOKEN_URL,
    // Consent only needs the OAuth client credentials; the data API base is for
    // activity/recovery pulls and is not required to start an authorization.
    oauthConfigured: Boolean(clientId && clientSecret),
    dataConfigured: Boolean(apiBase),
  };
}

function garminRedirectUri(): string {
  return env('GARMIN_REDIRECT_URI') || DEFAULT_REDIRECT_URI;
}

// Where the athlete's browser lands after consent. The X-Base44-App-Url header carries
// the public app origin; deriving it from req.url would strand them on the runtime host.
function appOrigin(req: Request): string {
  const header = req.headers.get('X-Base44-App-Url');
  if (header) return header.replace(/\/+$/, '');
  try { return new URL(garminRedirectUri()).origin; } catch { return 'https://trainpacelab.base44.app'; }
}

// Browser redirect: Garmin sends ?code=...&state=<athlete_id>.<sig>. No user session (it's a redirect
// landing), so authenticate via state HMAC + resolve the owner from the athlete profile's created_by_id.
async function handleOAuthCallback(req, base44) {
  const { clientId, clientSecret, tokenUrl, oauthConfigured } = requireConfig();
  if (!oauthConfigured) return Response.json({ error: 'Garmin not configured' }, { status: 503 });
  const u = new URL(req.url);
  const code = u.searchParams.get('code');
  const state = u.searchParams.get('state') || '';
  if (!code) return Response.json({ error: 'Missing authorization code' }, { status: 400 });
  const [athleteId, sig] = state.split('.');
  if (!athleteId || !sig) return Response.json({ error: 'Invalid state' }, { status: 400 });
  if (await hmacBase64Url(athleteId, clientSecret) !== sig) return Response.json({ error: 'Invalid state signature' }, { status: 401 });

  const redirectUri = garminRedirectUri();
  const tokenRes = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri, client_id: clientId, client_secret: clientSecret }),
  });
  if (!tokenRes.ok) return Response.json({ error: `Token exchange failed: ${tokenRes.status}`, details: await tokenRes.text() }, { status: 502 });
  const tok = await tokenRes.json();

  const athlete = await base44.asServiceRole.entities.AthleteProfile.get(athleteId).catch(() => null);
  if (!athlete) return Response.json({ error: 'Athlete profile not found' }, { status: 404 });

  const now = new Date();
  const existing = await base44.asServiceRole.entities.GarminConnection.filter({ athlete_id: athleteId });
  for (const c of existing) await base44.asServiceRole.entities.GarminConnection.delete(c.id);

  await base44.asServiceRole.entities.GarminConnection.create({
    athlete_id: athleteId, created_by_id: athlete.created_by_id,
    garmin_user_id: tok.user_id || tok.garmin_user_id || null,
    access_token: tok.access_token, refresh_token: tok.refresh_token || null,
    token_expires_at: new Date(now.getTime() + (tok.expires_in || 3600) * 1000).toISOString(),
    status: 'connected', connected_at: now.toISOString(), last_sync_at: null,
  });

  const origin = appOrigin(req);
  const html = `<!doctype html><meta http-equiv="refresh" content="2;url=${origin}/settings"><body style="font-family:system-ui;padding:3rem"><h2>Garmin connected</h2><p>Redirecting to your settings…</p><p><a href="${origin}/settings">Back to settings</a></p></body>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html' } });
}

async function handleAuthorize(req, base44) {
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { clientId, clientSecret, authorizeUrl, oauthConfigured } = requireConfig();
  if (!oauthConfigured) return Response.json({ error: 'Garmin is not configured yet. Add GARMIN_CLIENT_ID and GARMIN_CLIENT_SECRET in your app secrets.' }, { status: 503 });
  const athlete = await getOwnedAthlete(base44, user.id);
  if (!athlete) return Response.json({ error: 'No athlete profile found' }, { status: 404 });
  const state = `${athlete.id}.${await hmacBase64Url(athlete.id, clientSecret)}`;
  const redirectUri = garminRedirectUri();
  const params = new URLSearchParams({ client_id: clientId, response_type: 'code', redirect_uri: redirectUri, state });
  const url = `${authorizeUrl}?${params.toString()}`;
  console.log('Garmin authorize →', authorizeUrl, '| redirect_uri:', redirectUri);
  return Response.json({ authorize_url: url, redirect_uri: redirectUri });
}

async function handleStatus(base44) {
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const athlete = await getOwnedAthlete(base44, user.id);
  if (!athlete) return Response.json({ connected: false });
  const conns = await base44.asServiceRole.entities.GarminConnection.filter({ athlete_id: athlete.id });
  const c = conns[0];
  if (!c) return Response.json({ connected: false });
  return Response.json({ connected: c.status === 'connected' && Boolean(c.access_token), status: c.status, connected_at: c.connected_at || null, last_sync_at: c.last_sync_at || null, last_error: c.last_error || null });
}

async function handleSyncHistorical(base44) {
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { apiBase, dataConfigured } = requireConfig();
  if (!dataConfigured) return Response.json({ error: 'Garmin is not configured yet.' }, { status: 503 });
  const athlete = await getOwnedAthlete(base44, user.id);
  if (!athlete) return Response.json({ error: 'No athlete profile found' }, { status: 404 });
  const conns = await base44.asServiceRole.entities.GarminConnection.filter({ athlete_id: athlete.id });
  const conn = conns[0];
  if (!conn || !conn.access_token) return Response.json({ error: 'Garmin account not connected' }, { status: 409 });

  let accessToken = conn.access_token;
  const now = Date.now();
  const expiresAt = conn.token_expires_at ? Date.parse(conn.token_expires_at) : 0;
  if (expiresAt <= now + 60_000 && conn.refresh_token) {
    try {
      const r = await fetch(`${apiBase}/oauth2/token`, {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: conn.refresh_token, client_id: env('GARMIN_CLIENT_ID'), client_secret: env('GARMIN_CLIENT_SECRET') }),
      });
      if (r.ok) {
        const tok = await r.json(); accessToken = tok.access_token;
        await base44.asServiceRole.entities.GarminConnection.update(conn.id, { access_token: tok.access_token, refresh_token: tok.refresh_token || conn.refresh_token, token_expires_at: new Date(now + (tok.expires_in || 3600) * 1000).toISOString() });
      }
    } catch { /* best-effort */ }
  }

  const lookbackDays = await getSyncLookbackDays(base44, user.id);
  const lookbackCutoff = lookbackDays === Infinity ? null : new Date(Date.now() - lookbackDays * 86400000);
  let imported = 0, errors = 0;
  try {
    const res = await fetch(`${apiBase}/activities`, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) { await base44.asServiceRole.entities.GarminConnection.update(conn.id, { last_error: `Historical fetch failed: ${res.status}` }); return Response.json({ error: `Historical fetch failed: ${res.status}` }, { status: 502 }); }
    const data = await res.json();
    let list = Array.isArray(data) ? data : (data.activities || data.items || data.data || []);
    if (lookbackCutoff) list = list.filter((a) => {
      const d = a.date || (a.start_time ? a.start_time.slice(0, 10) : null) || (a.timestamp ? a.timestamp.slice(0, 10) : null);
      return d && new Date(d) >= lookbackCutoff;
    });
    const restHr = athlete.resting_hr || 60, maxHr = athlete.max_heart_rate || 190;
    const toCreate = [];
    for (const a of list) {
      const date = a.date || (a.start_time ? a.start_time.slice(0, 10) : null) || (a.timestamp ? a.timestamp.slice(0, 10) : null);
      const durationSeconds = Number(a.duration_seconds ?? a.duration ?? a.elapsed_time ?? 0);
      const durationMinutes = durationSeconds / 60 || Number(a.duration_minutes || 0);
      if (!date || isNaN(Date.parse(date)) || durationMinutes < 1 || durationMinutes > 1440) { errors++; continue; }
      const sport = normalizeSport(a.sport || a.activity_type || a.type);
      let distanceKm = Number(a.distance_km ?? 0); if (!distanceKm && a.distance_m) distanceKm = a.distance_m / 1000;
      const existing = await base44.asServiceRole.entities.WorkoutSession.filter({ athlete_id: athlete.id, date });
      if (existing.some((s) => s.sport === sport && Math.abs((s.duration_minutes||0) - durationMinutes) < 1 && Math.abs((s.distance_km||0) - distanceKm) < 0.1)) continue;
      const avgHr = Number(a.avg_heart_rate ?? a.average_heart_rate) || null;
      toCreate.push({ athlete_id: athlete.id, created_by_id: athlete.created_by_id, date, sport, duration_minutes: Math.round(durationMinutes*100)/100, duration_seconds: Math.round(durationMinutes*60), distance_km: Math.round(distanceKm*100)/100, avg_hr: avgHr || undefined, max_hr: Number(a.max_heart_rate) || undefined, source_format: 'webhook', session_trimp: avgHr ? calcTrimp(durationMinutes, avgHr, restHr, maxHr, athlete.sex) : 0 });
    }
    for (let i = 0; i < toCreate.length; i += 500) await base44.asServiceRole.entities.WorkoutSession.bulkCreate(toCreate.slice(i, i + 500));
    imported = toCreate.length;
    for (const d of [...new Set(toCreate.map((s) => s.date))]) { try { await base44.asServiceRole.functions.invoke('calculateDailyTRIMP', { athlete_id: athlete.id, date: d }); } catch {} }

    // Recovery backfill: pull recent daily summaries (sleep / HRV / resting HR / body battery /
    // stress / training readiness) through the same normalizer + ingest path used by live
    // webhook pushes, so newly-connected athletes get rolling baselines immediately instead of
    // waiting for pushes to accumulate. Best-effort — no-ops if the endpoint is unavailable.
    let recoveryImported = 0;
    try {
      const rRes = await fetch(`${apiBase}/dailies`, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (rRes.ok) {
        const rData = await rRes.json();
        const dailies = Array.isArray(rData) ? rData : (rData.dailies || rData.items || rData.data || []);
        if (dailies.length) {
          const history = await base44.asServiceRole.entities.DailyMetrics.filter({ athlete_id: athlete.id }, '-date', 30);
          for (const d of dailies) {
            const normalized = normalizeGarminRecovery(d);
            if (!normalized) continue;
            try {
              const result = await ingestRecovery(base44, athlete.id, normalized, 'garmin', history);
              if (!result?.skipped) recoveryImported++;
            } catch { /* per-day best-effort */ }
          }
        }
      }
    } catch { /* recovery backfill is best-effort */ }

    await base44.asServiceRole.entities.GarminConnection.update(conn.id, { last_sync_at: new Date().toISOString(), last_error: '' });
  } catch (e) {
    await base44.asServiceRole.entities.GarminConnection.update(conn.id, { last_error: e.message });
    return Response.json({ error: e.message }, { status: 500 });
  }
  return Response.json({ success: true, imported, errors, recovery_imported: recoveryImported });
}

async function handleDisconnect(base44) {
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const athlete = await getOwnedAthlete(base44, user.id);
  if (!athlete) return Response.json({ success: true });
  const conns = await base44.asServiceRole.entities.GarminConnection.filter({ athlete_id: athlete.id });
  for (const c of conns) await base44.asServiceRole.entities.GarminConnection.delete(c.id);
  return Response.json({ success: true });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const u = new URL(req.url);
    if (u.searchParams.get('code') && u.searchParams.get('state')) return await handleOAuthCallback(req, base44);
    const body = await req.json().catch(() => ({}));
    const action = body.action || u.searchParams.get('action');
    if (action === 'authorize') return await handleAuthorize(req, base44);
    if (action === 'status') return await handleStatus(base44);
    if (action === 'sync_historical') return await handleSyncHistorical(base44);
    if (action === 'disconnect') return await handleDisconnect(base44);
    return Response.json({ error: `Unknown action: ${action || '(none)'}` }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});