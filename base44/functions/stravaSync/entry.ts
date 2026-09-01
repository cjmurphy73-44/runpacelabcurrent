import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { VALID_SPORTS, calcTrimp, normalizeSport, getOwnedAthlete, selfUrl } from '../../shared/workoutIngest.ts';
import { env, hmacBase64Url } from '../../shared/oauth.ts';

const STRAVA_API = 'https://www.strava.com';
const SCOPE = 'read,activity:read_all';

function requireConfig() {
  const clientId = env('STRAVA_CLIENT_ID'), clientSecret = env('STRAVA_CLIENT_SECRET');
  return { clientId, clientSecret, configured: Boolean(clientId && clientSecret) };
}

async function refreshStravaToken(base44, conn) {
  const now = Date.now();
  const expiresAt = conn.token_expires_at ? Date.parse(conn.token_expires_at) : 0;
  if (expiresAt > now + 60_000) return conn.access_token;
  const r = await fetch(`${STRAVA_API}/oauth/token`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: env('STRAVA_CLIENT_ID'), client_secret: env('STRAVA_CLIENT_SECRET'), grant_type: 'refresh_token', refresh_token: conn.refresh_token }),
  });
  if (!r.ok) return null;
  const tok = await r.json();
  await base44.asServiceRole.entities.StravaConnection.update(conn.id, { access_token: tok.access_token, refresh_token: tok.refresh_token, token_expires_at: new Date(Date.now() + (tok.expires_in || 21600) * 1000).toISOString() });
  return tok.access_token;
}

async function handleOAuthCallback(req, base44) {
  const { clientId, clientSecret, configured } = requireConfig();
  if (!configured) return Response.json({ error: 'Strava not configured' }, { status: 503 });
  const u = new URL(req.url);
  const code = u.searchParams.get('code');
  const state = u.searchParams.get('state') || '';
  if (!code) return Response.json({ error: 'Missing authorization code' }, { status: 400 });
  const [athleteId, sig] = state.split('.');
  if (!athleteId || !sig) return Response.json({ error: 'Invalid state' }, { status: 400 });
  if (await hmacBase64Url(athleteId, clientSecret) !== sig) return Response.json({ error: 'Invalid state signature' }, { status: 401 });

  const redirectUri = selfUrl(req);
  const tokenRes = await fetch(`${STRAVA_API}/oauth/token`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri }),
  });
  if (!tokenRes.ok) return Response.json({ error: `Token exchange failed: ${tokenRes.status}`, details: await tokenRes.text() }, { status: 502 });
  const tok = await tokenRes.json();

  const athlete = await base44.asServiceRole.entities.AthleteProfile.get(athleteId).catch(() => null);
  if (!athlete) return Response.json({ error: 'Athlete profile not found' }, { status: 404 });

  const now = new Date();
  const existing = await base44.asServiceRole.entities.StravaConnection.filter({ athlete_id: athleteId });
  for (const c of existing) await base44.asServiceRole.entities.StravaConnection.delete(c.id);

  await base44.asServiceRole.entities.StravaConnection.create({
    athlete_id: athleteId, created_by_id: athlete.created_by_id,
    strava_athlete_id: String(tok.athlete?.id ?? ''),
    access_token: tok.access_token, refresh_token: tok.refresh_token,
    token_expires_at: new Date(now.getTime() + (tok.expires_in || 21600) * 1000).toISOString(),
    status: 'connected', connected_at: now.toISOString(), last_sync_at: null,
  });

  const html = `<!doctype html><meta http-equiv="refresh" content="2;url=${u.origin}/settings"><body style="font-family:system-ui;padding:3rem"><h2>Strava connected</h2><p>Redirecting to your settings…</p></body>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html' } });
}

async function handleAuthorize(req, base44) {
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { clientId, clientSecret, configured } = requireConfig();
  if (!configured) return Response.json({ error: 'Strava is not configured yet. Add STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET in your app secrets.' }, { status: 503 });
  const athlete = await getOwnedAthlete(base44, user.id);
  if (!athlete) return Response.json({ error: 'No athlete profile found' }, { status: 404 });
  const state = `${athlete.id}.${await hmacBase64Url(athlete.id, clientSecret)}`;
  const redirectUri = selfUrl(req);
  const params = new URLSearchParams({ client_id: clientId, response_type: 'code', redirect_uri: redirectUri, approval_prompt: 'auto', scope: SCOPE, state });
  return Response.json({ authorize_url: `${STRAVA_API}/oauth/authorize?${params.toString()}`, redirect_uri: redirectUri });
}

async function handleStatus(base44) {
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const athlete = await getOwnedAthlete(base44, user.id);
  if (!athlete) return Response.json({ connected: false });
  const conns = await base44.asServiceRole.entities.StravaConnection.filter({ athlete_id: athlete.id });
  const c = conns[0];
  if (!c) return Response.json({ connected: false });
  return Response.json({ connected: c.status === 'connected' && Boolean(c.access_token), status: c.status, connected_at: c.connected_at, last_sync_at: c.last_sync_at, last_error: c.last_error });
}

async function handleSyncHistorical(base44) {
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!requireConfig().configured) return Response.json({ error: 'Strava is not configured yet.' }, { status: 503 });
  const athlete = await getOwnedAthlete(base44, user.id);
  if (!athlete) return Response.json({ error: 'No athlete profile found' }, { status: 404 });
  const conns = await base44.asServiceRole.entities.StravaConnection.filter({ athlete_id: athlete.id });
  const conn = conns[0];
  if (!conn || !conn.access_token) return Response.json({ error: 'Strava account not connected' }, { status: 409 });

  const token = await refreshStravaToken(base44, conn);
  if (!token) { await base44.asServiceRole.entities.StravaConnection.update(conn.id, { status: 'expired', last_error: 'Token refresh failed' }); return Response.json({ error: 'Token refresh failed' }, { status: 502 }); }

  let imported = 0, errors = 0;
  try {
    const res = await fetch(`${STRAVA_API}/api/v3/athlete/activities?per_page=100`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) { await base44.asServiceRole.entities.StravaConnection.update(conn.id, { last_error: `Historical fetch failed: ${res.status}` }); return Response.json({ error: `Historical fetch failed: ${res.status}` }, { status: 502 }); }
    const list = await res.json();
    const restHr = athlete.resting_hr || 60, maxHr = athlete.max_heart_rate || 190;
    const toCreate = [];
    for (const a of list) {
      const date = (a.start_date || a.start_date_local || '').slice(0, 10);
      const durationMinutes = (Number(a.elapsed_time || 0) / 60) || (Number(a.moving_time || 0) / 60);
      if (!date || durationMinutes < 1 || durationMinutes > 1440) { errors++; continue; }
      const sport = normalizeSport(a.sport_type || a.type);
      const distanceKm = Math.round((Number(a.distance || 0) / 1000) * 100) / 100;
      const existing = await base44.asServiceRole.entities.WorkoutSession.filter({ athlete_id: athlete.id, date });
      if (existing.some((s) => s.sport === sport && Math.abs((s.duration_minutes||0) - durationMinutes) < 1 && Math.abs((s.distance_km||0) - distanceKm) < 0.1)) continue;
      const avgHr = a.average_heartrate || null;
      toCreate.push({ athlete_id: athlete.id, created_by_id: athlete.created_by_id, date, sport: VALID_SPORTS.includes(sport) ? sport : 'running', duration_minutes: Math.round(durationMinutes*100)/100, duration_seconds: Math.round(durationMinutes*60), distance_km: distanceKm, avg_hr: avgHr || undefined, max_hr: a.max_heartrate || undefined, source_format: 'webhook', session_trimp: avgHr ? calcTrimp(durationMinutes, avgHr, restHr, maxHr, athlete.sex) : 0 });
    }
    for (let i = 0; i < toCreate.length; i += 500) await base44.asServiceRole.entities.WorkoutSession.bulkCreate(toCreate.slice(i, i + 500));
    imported = toCreate.length;
    for (const d of [...new Set(toCreate.map((s) => s.date))]) { try { await base44.asServiceRole.functions.invoke('calculateDailyTRIMP', { athlete_id: athlete.id, date: d }); } catch {} }
    await base44.asServiceRole.entities.StravaConnection.update(conn.id, { last_sync_at: new Date().toISOString(), last_error: '' });
  } catch (e) { await base44.asServiceRole.entities.StravaConnection.update(conn.id, { last_error: e.message }); return Response.json({ error: e.message }, { status: 500 }); }
  return Response.json({ success: true, imported, errors });
}

async function handleDisconnect(base44) {
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const athlete = await getOwnedAthlete(base44, user.id);
  if (!athlete) return Response.json({ success: true });
  const conns = await base44.asServiceRole.entities.StravaConnection.filter({ athlete_id: athlete.id });
  for (const c of conns) {
    try { await fetch(`${STRAVA_API}/oauth/deauthorize?access_token=${encodeURIComponent(c.access_token)}`, { method: 'POST' }); } catch {}
    await base44.asServiceRole.entities.StravaConnection.delete(c.id);
  }
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