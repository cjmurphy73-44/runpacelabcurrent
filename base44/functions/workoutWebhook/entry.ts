// base44/functions/workoutWebhook/entry.ts
// Personalized per-athlete webhook endpoint for automated workout ingestion.
//   - External POST with ?key=<api_key> (or X-Api-Key header): ingest a JSON workout summary or a FIT byte stream.
//   - Strava subscription verification (GET ?hub.challenge=...) and Strava event POSTs (ack-only).
//   - App-user actions via base44.functions.invoke({ action: "generate_key" | "get_key" }).
// Each ingest triggers recalculateCTLATLTSB so CTL/ATL/TSB on the dashboard update automatically.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { waitUntil } from 'base44:runtime';
import { VALID_SPORTS, calcTrimp, normalizeSport, getOwnedAthlete, selfUrl, parseFitSummary } from '../../shared/workoutIngest.ts';
import { assertSafeFileUrl } from '../../shared/urlGuard.ts';
import { recomputeCTLATLTSB } from '../../shared/ctlRecalc.ts';
import { runPostWorkoutEvaluation } from '../../shared/postWorkoutAI.ts';
import { reportError } from '../../shared/errorReport.ts';
import { claimRateLimit } from '../../shared/rateLimit.ts';
import { constantTimeEqual } from '../../shared/crypto.ts';

function randomKey() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

// selfUrl, getOwnedAthlete and parseFitSummary are imported from ../../shared/workoutIngest.ts.

// Build a WorkoutSession-shaped summary from a flexible JSON payload.
function jsonToSummary(body) {
  const date = body.date || (body.start_time ? body.start_time.slice(0, 10) : null) || (body.timestamp ? body.timestamp.slice(0, 10) : null);
  const durationSeconds = Number(body.duration_seconds ?? body.duration ?? 0);
  let distanceKm = Number(body.distance_km ?? 0);
  if (!distanceKm && body.distance_m) distanceKm = body.distance_m / 1000;
  return {
    derived_date: date,
    sport: normalizeSport(body.sport || body.activity_type || body.type),
    duration_seconds: durationSeconds,
    distance_km: distanceKm ? Math.round(distanceKm * 100) / 100 : null,
    avg_hr: Number(body.avg_heart_rate ?? body.avg_hr ?? body.average_heart_rate) || null,
    max_hr: Number(body.max_heart_rate ?? body.max_hr) || null,
  };
}

async function handleIngest(req, base44, apiKey, parsedBody) {
  const athletes = await base44.asServiceRole.entities.AthleteProfile.filter({ webhook_api_key: apiKey });
  const athlete = athletes[0];
  if (!athlete) return Response.json({ error: 'Invalid API key' }, { status: 401 });

  const body = parsedBody ?? {};

  // Strava delivers only activity references (no full data). Acknowledge so it stops retrying;
  // full per-activity Strava import needs Strava OAuth (follow-up) — use the Bulk tab meanwhile.
  if (body.object_type && body.aspect_type) {
    return Response.json({ success: true, ack: true, note: 'Strava event acknowledged.' });
  }

  let summary = null;
  let sourceFormat = 'webhook';
  if (body.file_base64 && /\.fit$/i.test(body.file_name || '')) {
    try {
      const binary = Uint8Array.from(atob(body.file_base64), (c) => c.charCodeAt(0));
      summary = parseFitSummary(binary);
      sourceFormat = 'fit';
    } catch { summary = null; }
  } else if (body.fit_url) {
    try {
      const urlCheck = assertSafeFileUrl(body.fit_url);
      if (!urlCheck.ok) return Response.json({ error: 'fit_url not allowed' }, { status: 400 });
      const r = await fetch(body.fit_url);
      if (r.ok) { const buf = new Uint8Array(await r.arrayBuffer()); summary = parseFitSummary(buf); sourceFormat = 'fit'; }
    } catch { /* fall through to JSON */ }
  }
  if (!summary) summary = jsonToSummary(body);

  const date = summary.derived_date;
  const durationMinutes = summary.duration_seconds ? summary.duration_seconds / 60 : Number(body.duration_minutes || 0);
  if (!date || isNaN(Date.parse(date)) || durationMinutes < 1 || durationMinutes > 1440) {
    return Response.json({ error: 'Invalid payload: missing date or duration out of range (1 min – 24h).' }, { status: 400 });
  }
  if (new Date(date) > new Date(Date.now() + 24 * 3600 * 1000)) {
    return Response.json({ error: 'date cannot be in the future' }, { status: 400 });
  }
  const sport = VALID_SPORTS.includes(summary.sport) ? summary.sport : 'running';
  const distanceKm = summary.distance_km || 0;

  // Idempotency: providers retry (Strava re-sends, COROS re-post). Key on
  // athlete + date + sport + rounded duration/distance so a re-push of the SAME
  // event is skipped exactly once — independent of the looser (±1min / ±0.1km)
  // fuzzy dedup below, which fails when rounding jitter slips past its window.
  const eventId = `generic:${athlete.id}:${date}:${sport}:${Math.round(durationMinutes * 100)}:${Math.round(distanceKm * 100)}`;
  try {
    const seen = await base44.asServiceRole.entities.WebhookEvent.filter({ event_id: eventId });
    if (seen.length > 0) return Response.json({ success: true, skipped: true, idempotent: true });
  } catch (e) { console.warn('WebhookEvent idempotency check failed:', e); /* fail open */ }

  // Dedup safeguard (mirrors webhookWearableSync / bulkIngestWorkouts).
  const existing = await base44.asServiceRole.entities.WorkoutSession.filter({ athlete_id: athlete.id, date });
  const isDuplicate = existing.some((s) =>
    s.sport === sport && Math.abs((s.duration_minutes || 0) - durationMinutes) < 1 && Math.abs((s.distance_km || 0) - distanceKm) < 0.1
  );
  if (isDuplicate) {
    try { await base44.asServiceRole.entities.WebhookEvent.create({ event_id: eventId, provider: 'generic', athlete_id: athlete.id, outcome: 'skipped_duplicate' }); } catch (e) { console.warn('WebhookEvent log failed:', e); }
    return Response.json({ success: true, skipped: true });
  }

  const restHr = athlete.resting_hr || 60;
  const maxHr = athlete.max_heart_rate || summary.max_hr || 190;
  const sessionTrimp = summary.avg_hr ? calcTrimp(durationMinutes, summary.avg_hr, restHr, maxHr, athlete.sex) : 0;

  const session = await base44.asServiceRole.entities.WorkoutSession.create({
    athlete_id: athlete.id,
    created_by_id: athlete.created_by_id,
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

  try { await base44.asServiceRole.entities.WebhookEvent.create({ event_id: eventId, provider: 'generic', athlete_id: athlete.id, workout_session_id: session.id, outcome: 'created' }); } catch (e) { console.warn('WebhookEvent log failed:', e); }

  // Recompute CTL/ATL/TSB across all days so dashboard metrics update automatically.
  try { await recomputeCTLATLTSB(base44, athlete.id); } catch (e) { console.warn('recalculateCTLATLTSB failed:', e); }

  // Post-Workout Insight Engine: dispatch the AI coach to generate + persist a
  // WorkoutFeedback insight record (with intensity) for this session. Fire and
  // forget — the webhook returns immediately; the insight is linked back to the
  // session by postWorkoutAIEvaluation and surfaces in real time via ActivityDetail.
  try {
    waitUntil(runPostWorkoutEvaluation(base44, session.id, athlete.id));
  } catch (e) { console.warn('postWorkoutAIEvaluation dispatch failed:', e); }

  return Response.json({ success: true, workout_session_id: session.id });
}

async function handleGenerateKey(req, base44) {
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const athlete = await getOwnedAthlete(base44, user.id);
  if (!athlete) return Response.json({ error: 'No athlete profile found' }, { status: 404 });
  const apiKey = randomKey();
  await base44.asServiceRole.entities.AthleteProfile.update(athlete.id, { webhook_api_key: apiKey });
  return Response.json({ api_key: apiKey, webhook_url: `${selfUrl(req)}?key=${apiKey}` });
}

async function handleGetKey(req, base44) {
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const athlete = await getOwnedAthlete(base44, user.id);
  if (!athlete) return Response.json({ api_key: null, webhook_url: null });
  const key = athlete.webhook_api_key || null;
  return Response.json({ api_key: key, webhook_url: key ? `${selfUrl(req)}?key=${key}` : null });
}

function env(name) { try { return Deno.env.get(name) || ''; } catch { return ''; } }

// Verify Strava's X-Strava-Signature header: format "t=<unix-seconds>,v1=<hex-hmac-sha256>"
// where the HMAC is keyed by STRAVA_CLIENT_SECRET and computed over "<timestamp>.<rawBody>".
// Rejects on malformed header, >5min timestamp skew, or signature mismatch (constant-time).
async function verifyStravaSignature(header: string, rawBody: string, clientSecret: string): Promise<boolean> {
  if (!clientSecret || !header) return false;
  const parts: Record<string, string> = {};
  for (const piece of header.split(',')) {
    const i = piece.indexOf('=');
    if (i !== -1) parts[piece.slice(0, i)] = piece.slice(i + 1);
  }
  const ts = parts['t'];
  const v1 = parts['v1'];
  if (!ts || !v1) return false;
  const tsNum = parseInt(ts, 10);
  if (isNaN(tsNum) || Math.abs(Date.now() / 1000 - tsNum) > 300) return false;
  try {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(clientSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${ts}.${rawBody}`));
    const expected = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
    return constantTimeEqual(v1, expected);
  } catch {
    return false;
  }
}

async function refreshStravaToken(base44, conn) {
  const now = Date.now();
  const expiresAt = conn.token_expires_at ? Date.parse(conn.token_expires_at) : 0;
  if (expiresAt > now + 60_000) return conn.access_token;
  const r = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: env('STRAVA_CLIENT_ID'), client_secret: env('STRAVA_CLIENT_SECRET'), grant_type: 'refresh_token', refresh_token: conn.refresh_token }),
  });
  if (!r.ok) return null;
  const tok = await r.json();
  await base44.asServiceRole.entities.StravaConnection.update(conn.id, { access_token: tok.access_token, refresh_token: tok.refresh_token, token_expires_at: new Date(Date.now() + (tok.expires_in || 21600) * 1000).toISOString() });
  return tok.access_token;
}

// Strava webhook event: validate the owner_id has a connected account, refresh the token, fetch the
// full activity from the Strava API, then run idempotency (C-19) + dedup + ingest.
async function handleStravaEvent(base44, body) {
  const owner = String(body.owner_id ?? '');
  const conns = await base44.asServiceRole.entities.StravaConnection.filter({ strava_athlete_id: owner });
  const conn = conns[0];
  if (!conn) return Response.json({ success: true, ack: true, note: 'No connected Strava account for owner_id' });

  const eventId = `strava:${body.object_id}:${body.object_type}:${body.aspect_type}`;
  try {
    const seen = await base44.asServiceRole.entities.WebhookEvent.filter({ event_id: eventId });
    if (seen.length > 0) return Response.json({ success: true, skipped: true, idempotent: true });
  } catch { /* fail open */ }

  if (body.aspect_type === 'delete') return Response.json({ success: true, ack: true });
  if (body.aspect_type !== 'create' && body.aspect_type !== 'update') return Response.json({ success: true, ack: true });

  const token = await refreshStravaToken(base44, conn);
  if (!token) {
    await base44.asServiceRole.entities.StravaConnection.update(conn.id, { status: 'expired', last_error: 'Token refresh failed' });
    return Response.json({ success: true, ack: true, note: 'Token refresh failed' });
  }

  let act;
  try {
    const r = await fetch(`https://www.strava.com/api/v3/activities/${body.object_id}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) return Response.json({ success: true, ack: true, note: `Strava activity fetch ${r.status}` });
    act = await r.json();
  } catch { return Response.json({ success: true, ack: true, note: 'Activity fetch error' }); }

  const date = (act.start_date || act.start_date_local || '').slice(0, 10);
  const durationMinutes = (Number(act.elapsed_time || 0) / 60) || (Number(act.moving_time || 0) / 60);
  if (!date || isNaN(Date.parse(date)) || durationMinutes < 1 || durationMinutes > 1440) return Response.json({ success: true, ack: true });
  const sport = normalizeSport(act.sport_type || act.type);
  const distanceKm = Math.round((Number(act.distance || 0) / 1000) * 100) / 100;

  const athlete = await base44.asServiceRole.entities.AthleteProfile.get(conn.athlete_id).catch(() => null);
  if (!athlete) return Response.json({ success: true, ack: true });

  const existing = await base44.asServiceRole.entities.WorkoutSession.filter({ athlete_id: conn.athlete_id, date });
  const isDuplicate = existing.some((s) => s.sport === sport && Math.abs((s.duration_minutes || 0) - durationMinutes) < 1 && Math.abs((s.distance_km || 0) - distanceKm) < 0.1);
  if (isDuplicate) {
    try { await base44.asServiceRole.entities.WebhookEvent.create({ event_id: eventId, provider: 'strava', athlete_id: conn.athlete_id, outcome: 'skipped_duplicate' }); } catch {}
    return Response.json({ success: true, skipped: true });
  }

  const restHr = athlete.resting_hr || 60, maxHr = athlete.max_heart_rate || 190;
  const avgHr = act.average_heartrate || null;
  const session = await base44.asServiceRole.entities.WorkoutSession.create({
    athlete_id: conn.athlete_id, created_by_id: athlete.created_by_id, date, sport: VALID_SPORTS.includes(sport) ? sport : 'running',
    duration_minutes: Math.round(durationMinutes * 100) / 100, duration_seconds: Math.round(durationMinutes * 60),
    distance_km: distanceKm, avg_hr: avgHr || undefined, max_hr: act.max_heartrate || undefined,
    source_format: 'webhook', session_trimp: avgHr ? calcTrimp(durationMinutes, avgHr, restHr, maxHr, athlete.sex) : 0,
  });

  try { await base44.asServiceRole.entities.WebhookEvent.create({ event_id: eventId, provider: 'strava', athlete_id: conn.athlete_id, workout_session_id: session.id, outcome: 'created' }); } catch {}
  try { await recomputeCTLATLTSB(base44, conn.athlete_id); } catch {}
  try { waitUntil(runPostWorkoutEvaluation(base44, session.id, conn.athlete_id)); } catch {}
  await base44.asServiceRole.entities.StravaConnection.update(conn.id, { last_sync_at: new Date().toISOString(), last_error: '', status: 'connected' });
  return Response.json({ success: true, workout_session_id: session.id });
}

// Strava push-subscription registration manager (one subscription per app, uses STRAVA_VERIFY_TOKEN).
async function handleSubscribeStrava(req, base44) {
  const user = await base44.auth.me();
  if (!user || user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });
  const clientId = env('STRAVA_CLIENT_ID'), clientSecret = env('STRAVA_CLIENT_SECRET'), verifyToken = env('STRAVA_VERIFY_TOKEN');
  if (!clientId || !clientSecret || !verifyToken) return Response.json({ error: 'STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET and STRAVA_VERIFY_TOKEN must be set' }, { status: 503 });
  const callbackUrl = selfUrl(req).split('?')[0];
  const r = await fetch('https://www.strava.com/api/v3/push_subscriptions', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, callback_url: callbackUrl, verify_token: verifyToken }),
  });
  const txt = await r.text();
  if (!r.ok) return Response.json({ error: `Strava subscription failed: ${r.status}`, details: txt }, { status: 502 });
  let parsed; try { parsed = JSON.parse(txt); } catch { parsed = txt; }
  return Response.json({ success: true, callback_url: callbackUrl, response: parsed });
}

Deno.serve(async (req) => {
  let base44;
  try {
    base44 = createClientFromRequest(req);
    const u = new URL(req.url);

    // Strava subscription verification handshake. The verify token is required unconditionally
    // so an unset STRAVA_VERIFY_TOKEN can't be bypassed to echo an arbitrary challenge.
    const hubChallenge = u.searchParams.get('hub.challenge');
    if (req.method === 'GET' && hubChallenge) {
      const verifyToken = env('STRAVA_VERIFY_TOKEN');
      if (!verifyToken) return Response.json({ error: 'Strava verify token not configured' }, { status: 401 });
      if (!constantTimeEqual(u.searchParams.get('hub.verify_token') || '', verifyToken)) {
        return Response.json({ error: 'Invalid verify token' }, { status: 401 });
      }
      return Response.json({ 'hub.challenge': hubChallenge });
    }

    // Read the raw body once so the Strava signature (an HMAC over the raw bytes) can be
    // verified, then parse it for routing.
    const raw = await req.text().catch(() => '');
    let body: any = {};
    try { body = raw ? JSON.parse(raw) : {}; } catch { body = {}; }

    // Strava webhook event POST (no API key; the subscription delivers to this public callback).
    // { object_type, object_id, aspect_type, owner_id, updates, event_time }
    if (body.object_type && body.object_id != null && body.aspect_type) {
      // Per-athlete rate limiting throttles forged/replayed event floods.
      const ownerId = String(body.owner_id ?? 'unknown');
      if (!claimRateLimit(`strava:${ownerId}`, 60, 3600 * 1000)) {
        return Response.json({ error: 'Rate limit exceeded' }, { status: 429 });
      }
      // Validate Strava's X-Strava-Signature when present (t=<ts>,v1=<hmac> over the raw body,
      // keyed by STRAVA_CLIENT_SECRET). Strava does not sign every event by default, so the
      // signature is enforced when provided and the rate limit + owner-resolution gate otherwise.
      const sigHeader = req.headers.get('x-strava-signature');
      if (sigHeader) {
        const ok = await verifyStravaSignature(sigHeader, raw, env('STRAVA_CLIENT_SECRET'));
        if (!ok) return Response.json({ error: 'Invalid signature' }, { status: 401 });
      }
      return await handleStravaEvent(base44, body);
    }

    // External ingest: ?key= or X-Api-Key header.
    const apiKey = u.searchParams.get('key') || req.headers.get('x-api-key');
    if (apiKey) return await handleIngest(req, base44, apiKey, body);

    // App-user / admin actions via base44.functions.invoke (POST { action }).
    const action = body.action;
    if (action === 'generate_key') return await handleGenerateKey(req, base44);
    if (action === 'get_key') return await handleGetKey(req, base44);
    if (action === 'subscribe_strava') return await handleSubscribeStrava(req, base44);
    return Response.json({ error: `Unknown action: ${action || '(none)'}` }, { status: 400 });
  } catch (error) {
    try { if (base44) await reportError(base44, { source: 'workoutWebhook', message: error.message, stack: error.stack, severity: 'High' }); } catch (e) { console.warn('reportError failed:', e); }
    return Response.json({ error: error.message }, { status: 500 });
  }
});