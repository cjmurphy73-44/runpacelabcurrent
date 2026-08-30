import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { VALID_SPORTS, calcTrimp, normalizeSport, getOwnedAthlete, selfUrl, parseFitSummary } from '../../shared/workoutIngest.ts';
import { env, hmacBase64Url } from '../../shared/oauth.ts';

function requireConfig() {
  const clientId = env('COROS_CLIENT_ID');
  const clientSecret = env('COROS_CLIENT_SECRET');
  const apiBase = env('COROS_API_BASE');
  return { clientId, clientSecret, apiBase, configured: Boolean(clientId && clientSecret && apiBase) };
}

// selfUrl, getOwnedAthlete and parseFitSummary are imported from ../../shared/workoutIngest.ts.

// ----- action handlers -----

// Browser redirect: Coros sends ?code=...&state=<athlete_id>.<sig>. No user session (it's a redirect landing),
// so we authenticate via state HMAC + resolve the owner from the athlete profile's created_by_id.
async function handleOAuthCallback(req, base44) {
  const { clientId, clientSecret, apiBase, configured } = requireConfig();
  if (!configured) return Response.json({ error: 'COROS not configured' }, { status: 503 });
  const u = new URL(req.url);
  const code = u.searchParams.get('code');
  const state = u.searchParams.get('state') || '';
  if (!code) return Response.json({ error: 'Missing authorization code' }, { status: 400 });
  const [athleteId, sig] = state.split('.');
  if (!athleteId || !sig) return Response.json({ error: 'Invalid state' }, { status: 400 });
  const expected = await hmacBase64Url(athleteId, clientSecret);
  if (expected !== sig) return Response.json({ error: 'Invalid state signature' }, { status: 401 });

  const redirectUri = selfUrl(req);
  const tokenRes = await fetch(`${apiBase}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  if (!tokenRes.ok) {
    const txt = await tokenRes.text();
    return Response.json({ error: `Token exchange failed: ${tokenRes.status}`, details: txt }, { status: 502 });
  }
  const tok = await tokenRes.json();

  const athlete = await base44.asServiceRole.entities.AthleteProfile.get(athleteId).catch(() => null);
  if (!athlete) return Response.json({ error: 'Athlete profile not found' }, { status: 404 });

  const now = new Date();
  // Replace any prior connection for this athlete.
  const existing = await base44.asServiceRole.entities.CorosConnection.filter({ athlete_id: athleteId });
  for (const c of existing) await base44.asServiceRole.entities.CorosConnection.delete(c.id);

  await base44.asServiceRole.entities.CorosConnection.create({
    athlete_id: athleteId,
    created_by_id: athlete.created_by_id,
    coros_user_id: tok.user_id || tok.coros_user_id || null,
    access_token: tok.access_token,
    refresh_token: tok.refresh_token || null,
    token_expires_at: new Date(now.getTime() + (tok.expires_in || 3600) * 1000).toISOString(),
    status: 'connected',
    connected_at: now.toISOString(),
    last_sync_at: null,
  });

  // Browser-facing success page → bounce back to Settings.
  const html = `<!doctype html><meta http-equiv="refresh" content="2;url=${u.origin}/settings"><body style="font-family:system-ui;padding:3rem"><h2>COROS connected</h2><p>Redirecting to your settings…</p></body>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html' } });
}

// Coros → us webhook delivery. No user session; authenticated by X-Coros-Signature == COROS_WEBHOOK_SECRET.
async function handleWebhook(req, base44) {
  const webhookSecret = env('COROS_WEBHOOK_SECRET');
  if (!webhookSecret) return Response.json({ error: 'Webhook secret not configured' }, { status: 503 });
  const sig = req.headers.get('x-coros-signature') || req.headers.get('x-coros-signature');
  if (!sig || sig !== webhookSecret) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  // Resolve the athlete: prefer coros_user_id → CorosConnection, else payload.athlete_id (still secret-gated).
  let athleteId = null;
  let connection = null;
  if (body.coros_user_id) {
    const conns = await base44.asServiceRole.entities.CorosConnection.filter({ coros_user_id: body.coros_user_id });
    if (conns[0]) { connection = conns[0]; athleteId = connection.athlete_id; }
  }
  if (!athleteId && body.athlete_id) athleteId = body.athlete_id;
  if (!athleteId) return Response.json({ error: 'Could not resolve athlete from webhook payload' }, { status: 400 });

  const activity = body.activity || body.workout || body;
  let summary = null;
  let sourceFormat = 'webhook';
  if (body.fit_file_url || activity.fit_file_url) {
    try {
      const r = await fetch(body.fit_file_url || activity.fit_file_url);
      if (r.ok) {
        const buf = new Uint8Array(await r.arrayBuffer());
        summary = parseFitSummary(buf);
        sourceFormat = 'fit';
      }
    } catch (e) { /* fall through to JSON summary */ }
  }
  if (!summary) {
    const dur = Number(activity.duration_seconds ?? activity.duration ?? 0);
    const distRaw = activity.distance_km ?? activity.distance_meters ? activity.distance_meters / 1000 : null;
    summary = {
      derived_date: activity.date || activity.start_time?.slice(0, 10) || null,
      sport: normalizeSport(activity.sport || activity.activity_type),
      duration_seconds: dur,
      distance_km: distRaw !== null ? Math.round(distRaw * 100) / 100 : Number(activity.distance_km) || null,
      avg_hr: Number(activity.avg_heart_rate ?? activity.average_heart_rate) || null,
      max_hr: Number(activity.max_heart_rate) || null,
    };
  }

  const date = summary.derived_date;
  let durationMinutes = summary.duration_seconds ? summary.duration_seconds / 60 : Number(activity.duration_minutes || 0);
  if (!date || isNaN(Date.parse(date)) || durationMinutes < 1 || durationMinutes > 1440) {
    return Response.json({ error: 'Invalid activity: missing date or duration out of range' }, { status: 400 });
  }
  if (new Date(date) > new Date(Date.now() + 24 * 3600 * 1000)) {
    return Response.json({ error: 'date cannot be in the future' }, { status: 400 });
  }
  const sport = VALID_SPORTS.includes(summary.sport) ? summary.sport : 'running';
  const distanceKm = summary.distance_km || 0;

  const athlete = await base44.asServiceRole.entities.AthleteProfile.get(athleteId).catch(() => null);
  if (!athlete) return Response.json({ error: 'Athlete profile not found' }, { status: 404 });

  // Dedup safeguard (mirrors webhookWearableSync).
  const existingSessions = await base44.asServiceRole.entities.WorkoutSession.filter({ athlete_id: athleteId, date });
  const isDuplicate = existingSessions.some((s) =>
    s.sport === sport && Math.abs((s.duration_minutes || 0) - durationMinutes) < 1 && Math.abs((s.distance_km || 0) - distanceKm) < 0.1
  );
  if (isDuplicate) return Response.json({ success: true, skipped: true });

  const restHr = athlete.resting_hr || 60;
  const maxHr = athlete.max_heart_rate || summary.max_hr || 190;
  const sessionTrimp = summary.avg_hr ? calcTrimp(durationMinutes, summary.avg_hr, restHr, maxHr, athlete.sex) : 0;

  const session = await base44.asServiceRole.entities.WorkoutSession.create({
    athlete_id: athleteId,
    date,
    sport,
    duration_minutes: Math.round(durationMinutes * 100) / 100,
    duration_seconds: Math.round(durationMinutes * 60),
    distance_km: distanceKm,
    avg_hr: summary.avg_hr || undefined,
    max_hr: summary.max_hr || undefined,
    source_format: sourceFormat,
    session_trimp: sessionTrimp,
  });

  // Reuse the proven downstream pipeline from webhookWearableSync (recalculateCTLATLTSB is currently broken).
  try { await base44.asServiceRole.functions.invoke('calculateDailyTRIMP', { athlete_id: athleteId, date }); } catch (e) { console.warn('calculateDailyTRIMP failed:', e); }
  try { await base44.asServiceRole.functions.invoke('postWorkoutAIEvaluation', { athlete_id: athleteId, workout_session_id: session.id }); } catch (e) { console.warn('postWorkoutAIEvaluation failed:', e); }

  if (connection) {
    await base44.asServiceRole.entities.CorosConnection.update(connection.id, { last_sync_at: new Date().toISOString(), last_error: '' });
  }
  return Response.json({ success: true, workout_session_id: session.id });
}

// App-user action: return the COROS OAuth authorize URL + signed state so the browser can redirect.
async function handleAuthorize(req, base44) {
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { clientId, clientSecret, apiBase, configured } = requireConfig();
  if (!configured) return Response.json({ error: 'COROS is not configured yet. Add COROS_CLIENT_ID, COROS_CLIENT_SECRET and COROS_API_BASE in your app secrets.' }, { status: 503 });
  const athlete = await getOwnedAthlete(base44, user.id);
  if (!athlete) return Response.json({ error: 'No athlete profile found' }, { status: 404 });
  const state = `${athlete.id}.${await hmacBase64Url(athlete.id, clientSecret)}`;
  const redirectUri = selfUrl(req);
  const params = new URLSearchParams({ client_id: clientId, response_type: 'code', redirect_uri: redirectUri, state });
  return Response.json({ authorize_url: `${apiBase}/oauth/authorize?${params.toString()}`, redirect_uri: redirectUri });
}

async function handleStatus(base44) {
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const athlete = await getOwnedAthlete(base44, user.id);
  if (!athlete) return Response.json({ connected: false });
  const conns = await base44.asServiceRole.entities.CorosConnection.filter({ athlete_id: athlete.id });
  const c = conns[0];
  if (!c) return Response.json({ connected: false });
  return Response.json({
    connected: c.status === 'connected' && Boolean(c.access_token),
    status: c.status,
    connected_at: c.connected_at || null,
    last_sync_at: c.last_sync_at || null,
    last_error: c.last_error || null,
  });
}

async function handleSyncHistorical(base44) {
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { apiBase, configured } = requireConfig();
  if (!configured) return Response.json({ error: 'COROS is not configured yet.' }, { status: 503 });
  const athlete = await getOwnedAthlete(base44, user.id);
  if (!athlete) return Response.json({ error: 'No athlete profile found' }, { status: 404 });
  const conns = await base44.asServiceRole.entities.CorosConnection.filter({ athlete_id: athlete.id });
  const conn = conns[0];
  if (!conn || !conn.access_token) return Response.json({ error: 'COROS account not connected' }, { status: 409 });

  // Refresh token if expired.
  const now = Date.now();
  const expiresAt = conn.token_expires_at ? Date.parse(conn.token_expires_at) : 0;
  let accessToken = conn.access_token;
  if (expiresAt <= now + 60_000 && conn.refresh_token) {
    try {
      const r = await fetch(`${apiBase}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: conn.refresh_token,
          client_id: env('COROS_CLIENT_ID'),
          client_secret: env('COROS_CLIENT_SECRET'),
        }),
      });
      if (r.ok) {
        const tok = await r.json();
        accessToken = tok.access_token;
        await base44.asServiceRole.entities.CorosConnection.update(conn.id, {
          access_token: tok.access_token,
          refresh_token: tok.refresh_token || conn.refresh_token,
          token_expires_at: new Date(now + (tok.expires_in || 3600) * 1000).toISOString(),
        });
      }
    } catch (e) { /* keep best-effort */ }
  }

  // The exact COROS activities endpoint + payload shape must be confirmed with api@coros.com; this
  // maps a flexible activity-summary response so it works once the real endpoint returns one of the
  // common shapes.
  let imported = 0;
  let errors = 0;
  try {
    const res = await fetch(`${apiBase}/v1/activities`, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) {
      await base44.asServiceRole.entities.CorosConnection.update(conn.id, { last_error: `Historical fetch failed: ${res.status}` });
      return Response.json({ error: `Historical fetch failed: ${res.status}` }, { status: 502 });
    }
    const data = await res.json();
    const list = Array.isArray(data) ? data : (data.activities || data.items || data.data || []);
    const restHr = athlete.resting_hr || 60;
    const maxHr = athlete.max_heart_rate || 190;
    const toCreate = [];
    for (const a of list) {
      const date = a.date || (a.start_time ? a.start_time.slice(0, 10) : null) || (a.timestamp ? a.timestamp.slice(0, 10) : null);
      const durationSeconds = Number(a.duration_seconds ?? a.duration ?? a.total_duration_seconds ?? 0);
      const durationMinutes = durationSeconds / 60 || Number(a.duration_minutes || 0);
      if (!date || isNaN(Date.parse(date)) || durationMinutes < 1 || durationMinutes > 1440) { errors++; continue; }
      const sport = normalizeSport(a.sport || a.activity_type || a.type);
      let distanceKm = Number(a.distance_km ?? 0);
      if (!distanceKm && a.distance_m) distanceKm = a.distance_m / 1000;
      const existing = await base44.asServiceRole.entities.WorkoutSession.filter({ athlete_id: athlete.id, date });
      const dup = existing.some((s) => s.sport === sport && Math.abs((s.duration_minutes || 0) - durationMinutes) < 1 && Math.abs((s.distance_km || 0) - distanceKm) < 0.1);
      if (dup) continue;
      const avgHr = Number(a.avg_heart_rate ?? a.average_heart_rate) || null;
      const maxHrRow = Number(a.max_heart_rate) || null;
      toCreate.push({
        athlete_id: athlete.id,
        date,
        sport,
        duration_minutes: Math.round(durationMinutes * 100) / 100,
        duration_seconds: Math.round(durationMinutes * 60),
        distance_km: Math.round(distanceKm * 100) / 100,
        avg_hr: avgHr || undefined,
        max_hr: maxHrRow || undefined,
        source_format: 'webhook',
        session_trimp: avgHr ? calcTrimp(durationMinutes, avgHr, restHr, maxHr, athlete.sex) : 0,
      });
    }
    if (toCreate.length) {
      for (let i = 0; i < toCreate.length; i += 500) {
        await base44.asServiceRole.entities.WorkoutSession.bulkCreate(toCreate.slice(i, i + 500));
      }
    }
    imported = toCreate.length;
    const dates = [...new Set(toCreate.map((s) => s.date))];
    for (const d of dates) {
      try { await base44.asServiceRole.functions.invoke('calculateDailyTRIMP', { athlete_id: athlete.id, date: d }); } catch (e) { /* keep going */ }
    }
    await base44.asServiceRole.entities.CorosConnection.update(conn.id, { last_sync_at: new Date().toISOString(), last_error: '' });
  } catch (e) {
    await base44.asServiceRole.entities.CorosConnection.update(conn.id, { last_error: e.message });
    return Response.json({ error: e.message }, { status: 500 });
  }
  return Response.json({ success: true, imported, errors });
}

async function handleDisconnect(base44) {
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const athlete = await getOwnedAthlete(base44, user.id);
  if (!athlete) return Response.json({ success: true });
  const conns = await base44.asServiceRole.entities.CorosConnection.filter({ athlete_id: athlete.id });
  for (const c of conns) await base44.asServiceRole.entities.CorosConnection.delete(c.id);
  return Response.json({ success: true });
}

// ----- router -----

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Browser OAuth redirect lands with ?code=... (GET).
    const u = new URL(req.url);
    if (u.searchParams.get('code') && u.searchParams.get('state')) {
      return await handleOAuthCallback(req, base44);
    }

    // All app-user actions arrive as a JSON body { action, ... } from base44.functions.invoke (POST).
    const body = await req.json().catch(() => ({}));
    const action = body.action || u.searchParams.get('action');

    if (action === 'webhook' || req.headers.get('x-coros-signature')) {
      // Webhook is a direct external POST; rebuild a request carrying the JSON body for handleWebhook.
      const innerReq = new Request(req.url, { method: 'POST', headers: req.headers, body: JSON.stringify(body) });
      return await handleWebhook(innerReq, base44);
    }
    if (action === 'authorize') return await handleAuthorize(req, base44);
    if (action === 'status') return await handleStatus(base44);
    if (action === 'sync_historical') return await handleSyncHistorical(base44);
    if (action === 'disconnect') return await handleDisconnect(base44);

    return Response.json({ error: `Unknown action: ${action || '(none)'}` }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});