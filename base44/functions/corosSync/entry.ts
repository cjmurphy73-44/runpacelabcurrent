import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { VALID_SPORTS, calcTrimp, normalizeSport, getOwnedAthlete } from '../../shared/workoutIngest.ts';
import { resolveSessionLoad } from '../../shared/loadModel.ts';
import { resolveTimeInZone } from '../../shared/hrZones.ts';
import { resolveActiveCalories } from '../../shared/calories.ts';
import { env, hmacBase64Url } from '../../shared/oauth.ts';
import { ingestRecovery } from '../../shared/recoveryIngest.ts';
import { runPostWorkoutEvaluation } from '../../shared/postWorkoutAI.ts';
import { assertSafeFileUrl } from '../../shared/urlGuard.ts';
import { constantTimeEqual } from '../../shared/crypto.ts';
import { getSyncLookbackDays } from '../../shared/syncLookback.ts';
import { parseFitWithLaps, summarizeStream } from '../../shared/workoutParsers.ts';
import { isUsableTelemetry, storageStream, MAX_STREAM_SAMPLES } from '../../shared/streamValidity.ts';
import { persistCorosBatches, reconcileCorosWrites } from '../../shared/corosBatchPersistence.ts';
import { corosActivityId, isDuplicateCorosSession } from '../../shared/corosActivityIdentity.ts';
import {
  corosAccessToken, fetchWithTimeout, mcpPost, mcpToolCall,
  downloadCorosFit, queryCorosRecords,
} from '../../shared/corosMcp.ts';

// COROS MCP (Model Context Protocol) — OAuth 2.1 self-service integration.
// No COROS developer-portal application or approval required. Endpoints were
// discovered live from the MCP server's RFC 9728 protected-resource metadata:
//   issuer / authorization server   https://mcpus.coros.com
//   authorization_endpoint         https://mcpus.coros.com/oauth2/authorize
//   token_endpoint                 https://mcpus.coros.com/oauth2/token
//   registration_endpoint          https://mcpus.coros.com/connect/register  (DCR, done once)
//   MCP resource (JSON-RPC)        https://mcpus.coros.com/mcp
// Public client (token_endpoint_auth_method "none") + PKCE S256. The DCR-issued
// client_id is stored as the COROS_MCP_CLIENT_ID app secret and shared by all
// users; per-user credentials live in CorosConnection. MCP is polling-only
// (no webhook push) — sync_historical pulls on demand.

const AUTHORIZE_ENDPOINT = 'https://mcpus.coros.com/oauth2/authorize';
const TOKEN_ENDPOINT = 'https://mcpus.coros.com/oauth2/token';
const SCOPE = 'openid mcp.tools offline_access';
const MCP_PROTOCOL_VERSION = '2025-06-18';

function getClientId(): string {
  return env('COROS_MCP_CLIENT_ID');
}

// The public URL athletes' browsers are redirected to after COROS approval.
// req.url inside the Deno runtime is an internal dispatcher URL
// (https://base44-dispatcher-production.base44.workers.dev/run/<hash>) that does NOT
// match the redirect_uri registered with COROS during DCR, causing a 400 after consent.
// Use the stable public function URL, overridable via COROS_REDIRECT_URI if the DCR
// registration used a different value.
function selfUrl(_req: Request): string {
  const override = env('COROS_REDIRECT_URI');
  if (override) return override;
  return 'https://trainpacelab.base44.app/functions/corosSync';
}

// Public app origin for the callback page's "back to settings" link. req.url is the
// internal dispatcher URL (its .origin is the dispatcher host, not the app), and the
// browser must land on the real app. Prefer the platform's X-Base44-App-Url header;
// fall back to deriving from the registered redirect URI so it still works in tests.
function appOrigin(req: Request): string {
  const header = req.headers.get('X-Base44-App-Url');
  if (header) return header.replace(/\/+$/, '');
  const base = env('COROS_REDIRECT_URI') || 'https://trainpacelab.base44.app/functions/corosSync';
  try { return new URL(base).origin; } catch { return 'https://trainpacelab.base44.app'; }
}

// Friendly HTML callback page shown on the OAuth landing — surfaces COROS's real
// failure reason (invalid_grant, etc.) instead of raw JSON, with a link back to settings.
function escapeHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
// The consent window is closed when we opened it (the app refreshes status on focus),
// so the SPA is never force-reloaded or bounced through a redirect. Someone who
// landed here directly gets a plain confirmation with one link back.
function callbackPage(kind: 'success' | 'error', title: string, detail: string, origin: string): Response {
  const color = kind === 'success' ? '#16a34a' : '#dc2626';
  const heading = kind === 'success' ? 'COROS connected' : escapeHtml(title);
  const closeScript = kind === 'success'
    ? '<script>try{if(window.opener&&!window.opener.closed){window.close()}}catch(e){}</script>'
    : '';
  const html = `<!doctype html><meta charset="utf-8"><title>${heading}</title><body style="font-family:system-ui;padding:3rem;max-width:520px;margin:auto">
<h2 style="color:${color}">${heading}</h2>
<p style="color:#374151;white-space:pre-wrap">${escapeHtml(detail)}</p>
<p style="margin-top:1.5rem"><a href="${escapeHtml(origin)}/settings">Back to settings</a></p>${closeScript}</body>`;
  return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html' } });
}

// ---- base64url + PKCE helpers ----
function b64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlDecode(str: string): string {
  const s = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = s.length % 4 ? '='.repeat(4 - (s.length % 4)) : '';
  return atob(s + pad);
}
function randomB64url(n = 32): string {
  return b64url(crypto.getRandomValues(new Uint8Array(n)));
}
async function pkceChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return b64url(digest);
}

// HMAC-signed state carries athleteId + the PKCE verifier so the callback is stateless.
async function buildState(athleteId: string, verifier: string): Promise<string> {
  const payload = `${athleteId}.${b64url(new TextEncoder().encode(verifier))}`;
  const sig = await hmacBase64Url(payload, getClientId() || '');
  return `${payload}.${sig}`;
}
async function parseState(state: string): Promise<{ athleteId: string | null; verifier: string | null; ok: boolean }> {
  // State format: athleteId.b64url(verifier).sig  — three dot-separated parts.
  // buildState signs the full "athleteId.b64url(verifier)" payload, so we must
  // reconstruct that same payload before verifying the HMAC. Splitting into
  // only two parts (as the old code did) treats the verifier as the signature
  // and discards the real signature, so verification always fails.
  const parts = (state || '').split('.');
  if (parts.length < 3) return { athleteId: null, verifier: null, ok: false };
  const athleteId = parts[0];
  const verifierB64 = parts[1];
  const sig = parts.slice(2).join('.');
  if (!athleteId || !verifierB64 || !sig) return { athleteId: null, verifier: null, ok: false };
  const clientId = getClientId();
  if (!clientId) return { athleteId: null, verifier: null, ok: false };
  const payload = `${athleteId}.${verifierB64}`;
  if (!constantTimeEqual(await hmacBase64Url(payload, clientId), sig)) return { athleteId, verifier: null, ok: false };
  try { return { athleteId, verifier: b64urlDecode(verifierB64), ok: true }; }
  catch { return { athleteId, verifier: null, ok: false }; }
}


// ---- action handlers ----

// Browser redirect: COROS sends ?code=...&state=<athleteId>.<verifier>.<sig>. No user
// session (it's a redirect landing) so state is HMAC-verified and the owner resolved
// from the athlete profile's created_by_id.
async function handleOAuthCallback(req, base44) {
  const u = new URL(req.url);
  const origin = appOrigin(req);
  const code = u.searchParams.get('code');
  const state = u.searchParams.get('state') || '';
  console.log('COROS callback reached: origin =', origin, 'path =', u.pathname, 'has code =', Boolean(code), 'has state =', Boolean(state));
  if (!code) {
    console.error('COROS callback: missing authorization code');
    return callbackPage('error', 'Connection failed', 'COROS did not return an authorization code. Please try connecting again.', origin);
  }
  const { athleteId, verifier, ok } = await parseState(state);
  if (!ok || !athleteId || !verifier) {
    console.error('COROS callback: invalid state');
    return callbackPage('error', 'Connection failed', 'The security state from COROS did not verify. This usually means the link expired or was opened in a different browser. Please try connecting again.', origin);
  }

  const tokenRes = await fetchWithTimeout(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: selfUrl(req),
      ...(getClientId() ? { client_id: getClientId() } : {}),
      code_verifier: verifier,
    }),
  });
  if (!tokenRes.ok) {
    const txt = await tokenRes.text();
    console.error('COROS token exchange failed:', tokenRes.status, txt);
    // Map the common COROS reasons to plain language for the athlete.
    let reason = txt;
    try { const j = JSON.parse(txt); reason = j.error_description || j.error || txt; } catch { /* not JSON */ }
    const hint = /invalid_grant/i.test(reason)
      ? ' The authorization code expired (COROS allows only about a minute) or was already used. Log into coros.com first, then connect and approve quickly.'
      : /redirect_uri/i.test(reason)
        ? ' The redirect address did not match what COROS has registered. Contact support.'
        : '';
    return callbackPage('error', 'COROS connection failed', `COROS rejected the token exchange (${tokenRes.status}).${hint} Reason: ${reason}`, origin);
  }
  const tok = await tokenRes.json();

  const athlete = await base44.asServiceRole.entities.AthleteProfile.get(athleteId).catch(() => null);
  if (!athlete) {
    console.error('COROS callback: athlete profile not found', athleteId);
    return callbackPage('error', 'Connection failed', 'Your athlete profile could not be found. Complete your profile in TrainPaceLab, then try again.', origin);
  }

  const now = new Date();
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

  return callbackPage('success', '', 'Redirecting to your settings…', origin);
}

// Coros → us webhook delivery. No user session; authenticated by X-Coros-Signature == COROS_WEBHOOK_SECRET.
async function handleWebhook(req, base44) {
  const webhookSecret = env('COROS_WEBHOOK_SECRET');
  if (!webhookSecret) return Response.json({ error: 'Webhook secret not configured' }, { status: 503 });
  const sig = req.headers.get('x-coros-signature');
  if (!sig || !constantTimeEqual(sig, webhookSecret)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
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
  let fitParsed = null;
  if (body.fit_file_url || activity.fit_file_url) {
    try {
      const fitUrl = body.fit_file_url || activity.fit_file_url;
      const urlCheck = assertSafeFileUrl(fitUrl);
      if (!urlCheck.ok) return Response.json({ error: 'fit_file_url not allowed' }, { status: 400 });
      const r = await fetch(fitUrl);
      if (r.ok) {
        const parsed = parseFitWithLaps(new Uint8Array(await r.arrayBuffer()));
        if (parsed?.stream?.length) {
          const s = summarizeStream(parsed.stream);
          // Only a real recording replaces the summary; a header-only file falls through
          // so the session is still logged, just without telemetry.
          if (isUsableTelemetry(parsed.stream, s.duration_seconds)) {
            fitParsed = parsed;
            summary = {
              derived_date: activity.date || activity.start_time?.slice(0, 10) || null,
              sport: normalizeSport(activity.sport || activity.activity_type),
              duration_seconds: s.duration_seconds,
              distance_km: s.distance_km,
              avg_hr: s.avg_hr,
              max_hr: s.max_hr,
            };
            sourceFormat = 'fit';
          }
        }
      }
    } catch (e) { /* fall through to JSON summary */ }
  }
  if (!summary) {
    const dur = Number(activity.duration_seconds ?? activity.duration ?? 0);
    const distRaw = activity.distance_km ?? (activity.distance_meters ? activity.distance_meters / 1000 : null);
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

  const providerActivityId = corosActivityId(
    activity.label_id ?? activity.LabelId ?? body.label_id,
    activity.sport_type ?? activity.SportType ?? body.sport_type,
  );
  const existingSessions = await base44.asServiceRole.entities.WorkoutSession.filter({ athlete_id: athleteId, date });
  const candidate = { date, sport, duration_minutes: durationMinutes, distance_km: distanceKm,
    source_provider: 'coros', provider_activity_id: providerActivityId };
  const isDuplicate = existingSessions.some((s) => isDuplicateCorosSession(s, candidate));
  if (isDuplicate) return Response.json({ success: true, skipped: true });

  const restHr = athlete.resting_hr || 60;
  const maxHr = athlete.max_heart_rate || summary.max_hr || 190;
  const sessionTrimp = summary.avg_hr ? calcTrimp(durationMinutes, summary.avg_hr, restHr, maxHr, athlete.sex) : 0;

  const positiveOrNull = (v) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : null; };
  const nativeKcal = positiveOrNull(activity.calories ?? activity.active_calories ?? activity.active_kilocalories ?? body.calories);
  const temperatureC = positiveOrNull(activity.temperature_c ?? activity.average_temperature ?? body.temperature_c);
  const zoneResult = resolveTimeInZone({
    stream: fitParsed?.stream,
    durationSeconds: Math.round(durationMinutes * 60),
    restHr,
    maxHr,
  });
  const energy = resolveActiveCalories({
    nativeKcal,
    durationMin: durationMinutes,
    avgHr: summary.avg_hr,
    weightKg: athlete.weight_kg,
    age: athlete.age,
    sex: athlete.sex,
    temperatureC,
  });

  const session = await base44.asServiceRole.entities.WorkoutSession.create({
    athlete_id: athleteId,
    created_by_id: athlete.created_by_id,
    source_provider: 'coros',
    provider_activity_id: providerActivityId || undefined,
    date,
    sport,
    duration_minutes: Math.round(durationMinutes * 100) / 100,
    duration_seconds: Math.round(durationMinutes * 60),
    distance_km: distanceKm,
    avg_hr: summary.avg_hr || undefined,
    max_hr: summary.max_hr || undefined,
    source_format: sourceFormat,
    session_trimp: sessionTrimp,
    zone_seconds: zoneResult.zone_seconds,
    zone_method: zoneResult.zone_method,
    zone_bounds_bpm: zoneResult.zone_bounds_bpm,
    temperature_c: temperatureC ?? undefined,
    streams: fitParsed ? storageStream(fitParsed.stream.slice(0, MAX_STREAM_SAMPLES)) : undefined,
    laps: fitParsed?.laps?.length ? fitParsed.laps : undefined,
    ...energy,
  });

  try { await base44.asServiceRole.functions.invoke('calculateDailyTRIMP', { athlete_id: athleteId, date }); } catch (e) { console.warn('calculateDailyTRIMP failed:', e); }
  // Call the shared module directly (not the HTTP wrapper) — the webhook has no user
  // session, so the HTTP wrapper's base44.auth.me() check would reject it. The shared
  // module uses asServiceRole internally. Also fixes a parameter-name mismatch: the
  // old call passed workout_session_id but the wrapper expected workout_id.
  try { await runPostWorkoutEvaluation(base44, session.id, athleteId); } catch (e) { console.warn('postWorkoutAIEvaluation failed:', e); }

  if (connection) {
    await base44.asServiceRole.entities.CorosConnection.update(connection.id, { last_sync_at: new Date().toISOString(), last_error: '' });
  }
  return Response.json({ success: true, workout_session_id: session.id });
}

// App-user action: return the COROS MCP OAuth authorize URL (PKCE) for the browser to redirect to.
async function handleAuthorize(req, base44) {
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const athlete = await getOwnedAthlete(base44, user.id);
  if (!athlete) return Response.json({ error: 'No athlete profile found' }, { status: 404 });

  const verifier = randomB64url(32);
  const challenge = await pkceChallenge(verifier);
  const state = await buildState(athlete.id, verifier);
  const redirectUri = selfUrl(req);
  console.log('COROS authorize: redirect_uri =', redirectUri, 'athlete =', athlete.id);
  const params = new URLSearchParams({
    response_type: 'code',
    ...(getClientId() ? { client_id: getClientId() } : {}),
    redirect_uri: redirectUri,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    scope: SCOPE,
    state,
  });
  return Response.json({ authorize_url: `${AUTHORIZE_ENDPOINT}?${params.toString()}`, redirect_uri: redirectUri });
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
    needs_reconnect: c.status === 'expired',
    status: c.status,
    connected_at: c.connected_at || null,
    last_sync_at: c.last_sync_at || null,
    last_error: c.last_error || null,
  });
}

// Emails the athlete once when their COROS link expires so they can reconnect.
async function notifyReconnect(athlete: any, base44): Promise<void> {
  try {
    const owner = athlete.created_by_id
      ? await base44.asServiceRole.entities.User.get(athlete.created_by_id).catch(() => null)
      : null;
    if (!owner?.email) return;
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: owner.email,
      template_name: 'CorosReconnect',
      variables: { first_name: athlete.first_name || 'there' },
    });
  } catch (e) { console.warn('CorosReconnect email failed:', e.message); }
}

// force = refresh even if the access token is still valid (scheduled sync does this so any
// rotated/extended refresh token is persisted and the connection never silently ages out).
// Token refresh lives in shared/corosMcp.ts so the historical backfill re-authorizes the
// same way this sync does rather than carrying a second copy of the logic.
async function refreshIfNeeded(conn, base44, force = false): Promise<string> {
  return corosAccessToken(conn, base44, force);
}

// MCP transport, the activity report parser and the FIT download now live in
// shared/corosMcp.ts — imported below so the backfill requests files identically.

// Merge a downloaded activity file into an already-mapped summary payload. Everything the
// file measures wins, because the report only holds averages. Returns false (and changes
// nothing) when the file is not a usable recording.
function applyFitTelemetry(payload: any, fit: any, athlete: any): boolean {
  if (!fit?.stream?.length) return false;
  const measured = summarizeStream(fit.stream);
  if (!isUsableTelemetry(fit.stream, measured.duration_seconds)) return false;
  const restHr = athlete.resting_hr || 60;
  const maxHr = athlete.max_heart_rate || payload.max_hr || measured.max_hr || 190;
  const durationSeconds = measured.duration_seconds || payload.duration_seconds;
  const zoneResult = resolveTimeInZone({ stream: fit.stream, durationSeconds, restHr, maxHr });

  payload.source_format = fit.fileType;
  payload.duration_seconds = durationSeconds;
  payload.duration_minutes = Math.round((durationSeconds / 60) * 100) / 100;
  if (measured.distance_km) payload.distance_km = measured.distance_km;
  if (measured.avg_hr) payload.avg_hr = measured.avg_hr;
  // The downloaded recording is the measured source, so the load is integrated from it
  // rather than recomputed from the summary average the report carried.
  const load = resolveSessionLoad({
    stream: fit.stream,
    durationSeconds,
    avgHr: measured.avg_hr || payload.avg_hr,
    restHr,
    maxHr,
    sex: athlete.sex,
  });
  payload.session_trimp = load.session_trimp;
  payload.load_source = load.load_source;
  payload.load_coverage_pct = load.load_coverage_pct;
  if (measured.max_hr) payload.max_hr = measured.max_hr;
  if (measured.avg_power) payload.avg_power = measured.avg_power;
  if (measured.avg_cadence) payload.avg_cadence = measured.avg_cadence;
  payload.zone_seconds = zoneResult.zone_seconds;
  payload.zone_method = zoneResult.zone_method;
  payload.zone_bounds_bpm = zoneResult.zone_bounds_bpm;
  payload.streams = storageStream(fit.stream.slice(0, MAX_STREAM_SAMPLES));
  if (fit.laps?.length) payload.laps = fit.laps.slice(0, 200);
  return true;
}

function mapRecord(a: any, athlete: any) {
  const date = a.date
    || (a.start_time ? String(a.start_time).slice(0, 10) : null)
    || (a.startTime ? String(a.startTime).slice(0, 10) : null)
    || (a.timestamp ? String(a.timestamp).slice(0, 10) : null);
  const durationSeconds = Number(a.duration_seconds ?? a.duration ?? a.total_duration_seconds ?? a.totalDuration ?? 0);
  const durationMinutes = durationSeconds / 60 || Number(a.duration_minutes ?? a.durationMinutes ?? 0);
  if (!date || isNaN(Date.parse(date)) || durationMinutes < 1 || durationMinutes > 1440) return null;
  const sport = normalizeSport(a.sport || a.activity_type || a.sportType || a.type);
  const s = VALID_SPORTS.includes(sport) ? sport : 'running';
  let distanceKm = Number(a.distance_km ?? a.distanceKm ?? 0);
  if (!distanceKm && a.distance_m) distanceKm = a.distance_m / 1000;
  if (!distanceKm && a.distanceMeters) distanceKm = a.distanceMeters / 1000;
  const avgHr = Number(a.avg_heart_rate ?? a.average_heart_rate ?? a.avgHr ?? a.avgHeartRate) || null;
  const maxHrRow = Number(a.max_heart_rate ?? a.maxHeartRate ?? a.max_hr) || null;
  const restHr = athlete.resting_hr || 60;
  const maxHr = athlete.max_heart_rate || maxHrRow || 190;
  const nativeKcal = Number(a.calories ?? a.active_calories ?? a.active_kilocalories ?? a.kilocalories ?? 0) || null;
  const temperatureC = Number(a.temperature_c ?? a.average_temperature ?? 0) || null;

  // COROS MCP exposes summary records only (no per-second stream). Summary imports get
  // no zone distribution at all: resolveTimeInZone returns 'none' with empty zones, so
  // no estimated split is ever written and the session stays out of zone analytics.
  const zoneResult = resolveTimeInZone({
    laps: [],
    avgHr,
    durationSeconds: Math.round(durationMinutes * 60),
    restHr,
    maxHr,
  });
  const energy = resolveActiveCalories({
    nativeKcal,
    durationMin: durationMinutes,
    avgHr,
    weightKg: athlete.weight_kg,
    age: athlete.age,
    sex: athlete.sex,
    temperatureC,
  });

  return {
    athlete_id: athlete.id,
    created_by_id: athlete.created_by_id,
    date,
    sport: s,
    duration_minutes: Math.round(durationMinutes * 100) / 100,
    duration_seconds: Math.round(durationMinutes * 60),
    distance_km: Math.round(distanceKm * 100) / 100,
    avg_hr: avgHr || undefined,
    max_hr: maxHrRow || undefined,
    source_format: 'webhook',
    session_trimp: avgHr ? calcTrimp(durationMinutes, avgHr, restHr, maxHr, athlete.sex) : 0,
    load_source: avgHr ? 'summary' : 'none',
    zone_seconds: zoneResult.zone_seconds,
    zone_method: zoneResult.zone_method,
    zone_bounds_bpm: zoneResult.zone_bounds_bpm,
    temperature_c: temperatureC ?? undefined,
    ...energy,
  };
}

// Service-role core: pulls 90 days of sport records for one athlete. Shared by the
// user-scoped on-demand sync and the scheduled sync_all loop.
async function syncHistoricalFor(athlete: any, accessToken: string, base44, lookbackDays = 90): Promise<{ imported: number; errors: number; records_found: number; duplicates: number; summary_only: number; write_uncertain: number; error_messages: string[] }> {
  // End date is bumped +1 day so today's workout is always inside the window
  // regardless of the athlete's timezone — the server runs in UTC, and a morning
  // session in UTC+10 would otherwise fall on "yesterday" and be skipped.
  const end = new Date();
  end.setDate(end.getDate() + 1);
  const start = new Date();
  start.setDate(start.getDate() - Math.min(90, lookbackDays));
  // COROS MCP requires yyyyMMdd (no dashes), and sportTypeCodes is mandatory — 65535 = all sports.
  const fmt = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '');

  const records = await queryCorosRecords(accessToken, fmt(start), fmt(end));
  let errors = 0;
  const mappedRecords = [];
  // label_id + sport_type are the keys the FIT download tools require; they are kept
  // beside the payload rather than written onto the session record.
  const fileKeys = new Map();
  for (const a of records) {
    const mapped = mapRecord(a, athlete);
    if (!mapped) { errors++; continue; }
    mapped.source_provider = 'coros';
    const activityId = corosActivityId(a.label_id, a.sport_type);
    if (activityId) mapped.provider_activity_id = activityId;
    if (a.label_id) fileKeys.set(mapped, { labelId: a.label_id, sportType: a.sport_type ?? null });
    mappedRecords.push(mapped);
  }

  // Batched duplicate check: read every date we may write to in a few $in queries instead of
  // one entity_list per workout. A 100-workout pull used to fire 100 list calls back-to-back
  // and trip the 140/minute entity limit.
  const queryDates = [...new Set(mappedRecords.map((s) => s.date))];
  const existingByDate = new Map<string, any[]>();
  for (let i = 0; i < queryDates.length; i += 100) {
    const rows = await base44.asServiceRole.entities.WorkoutSession.filter(
      { athlete_id: athlete.id, date: { $in: queryDates.slice(i, i + 100) } },
      'date',
      500,
    );
    for (const s of (Array.isArray(rows) ? rows : rows?.items || [])) {
      const bucket = existingByDate.get(s.date) || [];
      bucket.push(s);
      existingByDate.set(s.date, bucket);
    }
  }

  let duplicates = 0;
  const toCreate = [];
  for (const mapped of mappedRecords) {
    const sameDay = existingByDate.get(mapped.date) || [];
    const isDuplicate = (s) => isDuplicateCorosSession(s, mapped);
    if (sameDay.some(isDuplicate) || toCreate.some((s) => s.date === mapped.date && isDuplicate(s))) { duplicates++; continue; }
    toCreate.push(mapped);
  }
  // The sport record is a summary. COROS also keeps the original activity file, and only
  // that carries second-by-second telemetry, so it is fetched for every new session. When
  // no file exists the session is still created, summary-only, and stays out of zone
  // analytics because it has no stream.
  let summary_only = 0;
  const error_messages: string[] = [];
  for (const payload of toCreate) {
    const key = fileKeys.get(payload);
    if (!key) { summary_only++; continue; }
    try {
      const fit = await downloadCorosFit(accessToken, key.labelId, key.sportType);
      if (!applyFitTelemetry(payload, fit, athlete)) {
        summary_only++;
        error_messages.push('Original COROS FIT was unavailable or did not contain usable telemetry.');
      }
    } catch (e) {
      summary_only++;
      error_messages.push('Original COROS FIT retrieval failed; session retained as summary-only.');
      console.warn('COROS FIT ingest failed:', (e as Error).message);
    }
  }
  const write = await persistCorosBatches(
    toCreate,
    (batch) => base44.asServiceRole.entities.WorkoutSession.bulkCreate(batch),
  );
  error_messages.push(...write.errors);
  // If the bulk response was ambiguous, re-read provider IDs before reporting
  // confirmed writes. Never automatically retry on this request: another sync
  // may be concurrent, and Base44 has no atomic provider-ID uniqueness here.
  let reconciledDates = write.persisted_dates;
  let confirmedImported = write.imported;
  let writeUncertain = write.uncertain;
  if (write.uncertain > 0) {
    const reconciliation = await reconcileCorosWrites(toCreate, async (dates) => {
      const rows: any[] = [];
      for (const date of dates) {
        const page = await base44.asServiceRole.entities.WorkoutSession.filter(
          { athlete_id: athlete.id, date }, 'date', 500,
        );
        const items = Array.isArray(page) ? page : page?.items;
        if (!Array.isArray(items) || items.length >= 500) return { complete: false, rows: [] };
        rows.push(...items);
      }
      return { complete: true, rows };
    });
    if (reconciliation.retrySafe) {
      confirmedImported = reconciliation.verified.length;
      reconciledDates = reconciliation.persisted_dates;
      writeUncertain = reconciliation.missing.length;
      if (writeUncertain) error_messages.push(`${writeUncertain} COROS activities were not found after read-back. Re-sync after confirming no other import is running.`);
    } else {
      // A failed read is NOT proof of absence; retain the original uncertainty.
      error_messages.push(`COROS write reconciliation unavailable: ${reconciliation.reason}. Do not assume the activities are missing.`);
    }
  }
  // Recompute load only for dates whose saved sessions were confirmed.
  for (const d of reconciledDates) {
    try { await base44.asServiceRole.functions.invoke('calculateDailyTRIMP', { athlete_id: athlete.id, date: d }); }
    catch {
      error_messages.push('Daily load recomputation failed; sessions remain saved.');
    }
  }
  errors += write.failed + writeUncertain;
  return {
    imported: confirmedImported, errors, records_found: records.length, duplicates,
    summary_only, write_uncertain: writeUncertain, error_messages,
  };
}

async function handleSyncHistorical(base44) {
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const athlete = await getOwnedAthlete(base44, user.id);
  if (!athlete) return Response.json({ error: 'No athlete profile found' }, { status: 404 });
  const conns = await base44.asServiceRole.entities.CorosConnection.filter({ athlete_id: athlete.id });
  const conn = conns[0];
  if (!conn || !conn.access_token) return Response.json({ error: 'COROS account not connected' }, { status: 409 });

  let accessToken;
  try { accessToken = await refreshIfNeeded(conn, base44); }
  catch (e) {
    await base44.asServiceRole.entities.CorosConnection.update(conn.id, { last_error: e.message });
    return Response.json({ error: e.message }, { status: 502 });
  }

  try {
    const lookbackDays = await getSyncLookbackDays(base44, user.id);
    const out = await syncHistoricalFor(athlete, accessToken, base44, lookbackDays);
    const incomplete = out.errors > 0 || out.error_messages.length > 0;
    await base44.asServiceRole.entities.CorosConnection.update(conn.id, {
      last_sync_at: new Date().toISOString(),
      last_error: incomplete ? 'COROS sync incomplete: check recording and write diagnostics.' : '',
    });
    return Response.json({ success: !incomplete, outcome: incomplete ? 'partial' : 'completed', ...out });
  } catch (e) {
    await base44.asServiceRole.entities.CorosConnection.update(conn.id, { last_error: e.message });
    return Response.json({ error: e.message }, { status: 502 });
  }
}

// COROS MCP returns recovery data as formatted text reports across several tools. Each
// parser below returns a Map<dateString, partial values>; the caller merges them by date.
function parseCorosSleepHrvText(text: string): Map<string, number> {
  const out = new Map<string, number>();
  if (!text) return out;
  const re = /(\d{4}-\d{2}-\d{2}):\s*\n\s*HRV Avg:\s*(\d+)\s*ms/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) out.set(m[1], Number(m[2]));
  return out;
}

function parseCorosRestingHrText(text: string): Map<string, number> {
  const out = new Map<string, number>();
  if (!text) return out;
  const re = /(\d{4}-\d{2}-\d{2}):\s*(\d+)\s*bpm/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) out.set(m[1], Number(m[2]));
  return out;
}

function parseCorosSleepDataText(text: string): Map<string, { sleep_score: number | null; sleep_duration_hours: number | null }> {
  const out = new Map<string, { sleep_score: number | null; sleep_duration_hours: number | null }>();
  if (!text) return out;
  // COROS sleep overview is a text report with one block per date. The block
  // format has changed across MCP versions, so we split on date headers and
  // harvest score + duration with flexible labels (Main Sleep / Sleep Duration /
  // Total Sleep / Total Sleep Time) and flexible units (Xh Ymin, Ymin, minutes-only).
  const blocks = text.split(/(?=\d{4}-\d{2}-\d{2})/);
  for (const block of blocks) {
    const dateM = block.match(/^(\d{4}-\d{2}-\d{2})/);
    if (!dateM) continue;
    const date = dateM[1];
    const scoreM = block.match(/Sleep Score:\s*(\d+)/i);
    const sleepScore = scoreM ? Number(scoreM[1]) : null;

    let hours: number | null = null;
    // COROS Sleep Overview reports "Daily Sleep: Xh Ymin (incl. naps)" — the
    // total including naps. Fall back to "Main Sleep (asleep): Xh Ymin".
    const durMatch = block.match(/Daily Sleep:\s*(?:(\d+)\s*h\s*)?(?:(\d+)\s*min)?/i)
      || block.match(/Main Sleep \(asleep\):\s*(?:(\d+)\s*h\s*)?(?:(\d+)\s*min)?/i)
      || block.match(/(?:Sleep Duration|Total Sleep Time|Total Sleep|Sleep Time):\s*(?:(\d+)\s*h\s*)?(?:(\d+)\s*min)?/i);
    if (durMatch && (durMatch[1] || durMatch[2])) {
      const h = durMatch[1] ? Number(durMatch[1]) : 0;
      const m = durMatch[2] ? Number(durMatch[2]) : 0;
      hours = Math.round((h + m / 60) * 100) / 100;
    }
    if (sleepScore != null || hours != null) {
      out.set(date, { sleep_score: sleepScore, sleep_duration_hours: hours });
    }
  }
  return out;
}

function parseCorosStressText(text: string): Map<string, number> {
  const out = new Map<string, number>();
  if (!text) return out;
  const re = /(\d{4}-\d{2}-\d{2}):\s*\n\s*Average Stress:\s*(\d+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) out.set(m[1], Number(m[2]));
  return out;
}

function parseCorosRecoveryStatusText(text: string): number | null {
  if (!text) return null;
  const m = text.match(/Recovery:\s*(\d+)\s*%/);
  return m ? Number(m[1]) : null;
}

// Service-role core: pulls 14 days of recovery signals for one athlete. Shared by the
// user-scoped on-demand sync and the scheduled sync_all loop.
async function syncRecoveryFor(athlete: any, accessToken: string, base44): Promise<{ imported: number; errors: number; dates_found: number; toolErrors: string[] }> {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 14);
  const fmt = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '');
  const todayKey = new Date().toISOString().slice(0, 10);

  async function callTool(tool: string, args: any): Promise<string> {
    const result = await mcpToolCall(accessToken, tool, args);
    let text = result?.content?.[0]?.text;
    if (typeof text === 'string') { try { text = JSON.parse(text); } catch { /* not JSON-encoded */ } }
    return typeof text === 'string' ? text : '';
  }

  // Pull each recovery signal. Tools fail independently — a missing signal doesn't abort the sync.
  const hrvMap = new Map<string, number>();
  const rhrMap = new Map<string, number>();
  const sleepMap = new Map<string, { sleep_score: number | null; sleep_duration_hours: number | null }>();
  const stressMap = new Map<string, number>();
  let todayRecovery: number | null = null;
  const toolErrors: string[] = [];
  const pulls: [string, any, (t: string) => void][] = [
    ['querySleepHrv', { startDate: fmt(start), endDate: fmt(end), days: 14 }, (t) => parseCorosSleepHrvText(t).forEach((v, k) => hrvMap.set(k, v))],
    ['queryRestingHeartRate', { days: 14 }, (t) => parseCorosRestingHrText(t).forEach((v, k) => rhrMap.set(k, v))],
    ['querySleepOverview', { startDate: fmt(start), endDate: fmt(end), days: 14 }, (t) => parseCorosSleepDataText(t).forEach((v, k) => sleepMap.set(k, v))],
    ['queryStressLevel', { days: 14 }, (t) => parseCorosStressText(t).forEach((v, k) => stressMap.set(k, v))],
  ];
  for (const [tool, args, ingest] of pulls) {
    try { ingest(await callTool(tool, args)); } catch (e) { toolErrors.push(`${tool}: ${e.message}`); }
  }
  try { todayRecovery = parseCorosRecoveryStatusText(await callTool('queryRecoveryStatus', {})); } catch (e) { toolErrors.push(`queryRecoveryStatus: ${e.message}`); }

  // Merge all signals by date.
  const dates = new Set<string>([...hrvMap.keys(), ...rhrMap.keys(), ...sleepMap.keys(), ...stressMap.keys()]);
  if (todayRecovery != null) dates.add(todayKey);
  if (dates.size === 0) throw new Error(toolErrors.join('; ') || 'No COROS recovery data returned');

  // Preload both per-day lookups once for the whole window. Writing recovery used to make
  // two entity_list calls per day inside ingestRecovery (DailyMetrics + WebhookEvent), which
  // on its own could exceed the per-minute entity limit during a workout sync.
  const history = await base44.asServiceRole.entities.DailyMetrics.filter({ athlete_id: athlete.id }, '-date', 30);
  const metricsByDate = new Map<string, any>();
  for (const d of history) if (d?.date) metricsByDate.set(d.date, d);
  const eventIds = new Set<string>();
  const candidateIds = [...dates].map((d) => `coros:${athlete.id}:${d}:recovery`);
  for (let i = 0; i < candidateIds.length; i += 100) {
    const seen = await base44.asServiceRole.entities.WebhookEvent.filter(
      { event_id: { $in: candidateIds.slice(i, i + 100) } },
      '-created_date',
      500,
    );
    for (const e of (Array.isArray(seen) ? seen : seen?.items || [])) eventIds.add(e.event_id);
  }

  let ingested = 0;
  let errors = 0;
  for (const date of dates) {
    const normalized = {
      date,
      hrv: hrvMap.get(date) ?? null,
      resting_hr: rhrMap.get(date) ?? null,
      sleep_score: sleepMap.get(date)?.sleep_score ?? null,
      sleep_duration_hours: sleepMap.get(date)?.sleep_duration_hours ?? null,
      stress_score: stressMap.get(date) ?? null,
      provider_readiness_score: date === todayKey ? todayRecovery : null,
    };
    if (normalized.hrv == null && normalized.resting_hr == null && normalized.sleep_score == null && normalized.sleep_duration_hours == null && normalized.stress_score == null && normalized.provider_readiness_score == null) continue;
    try { await ingestRecovery(base44, athlete.id, normalized, 'coros', history, { eventIds, metricsByDate }); ingested++; } catch { errors++; }
  }
  return { imported: ingested, errors, dates_found: dates.size, toolErrors };
}

async function handleSyncRecovery(base44) {
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const athlete = await getOwnedAthlete(base44, user.id);
  if (!athlete) return Response.json({ error: 'No athlete profile found' }, { status: 404 });
  const conns = await base44.asServiceRole.entities.CorosConnection.filter({ athlete_id: athlete.id });
  const conn = conns[0];
  if (!conn || !conn.access_token) return Response.json({ error: 'COROS account not connected' }, { status: 409 });

  let accessToken;
  try { accessToken = await refreshIfNeeded(conn, base44); }
  catch (e) {
    await base44.asServiceRole.entities.CorosConnection.update(conn.id, { last_error: e.message });
    return Response.json({ error: e.message }, { status: 502 });
  }

  try {
    const out = await syncRecoveryFor(athlete, accessToken, base44);
    await base44.asServiceRole.entities.CorosConnection.update(conn.id, { last_sync_at: new Date().toISOString(), last_error: '' });
    return Response.json({ success: true, ...out });
  } catch (e) {
    await base44.asServiceRole.entities.CorosConnection.update(conn.id, { last_error: e.message });
    return Response.json({ error: e.message }, { status: 502 });
  }
}

// Scheduled (workflow) entry point: refresh tokens + sync every connected athlete. Admin-only:
// the scheduled workflow must run under an admin/service identity so it carries a session;
// anonymous or non-admin callers are rejected to prevent on-demand cross-tenant token use.
// Per-athlete try/catch so one bad connection never aborts the loop; refresh-token rotation
// is persisted by refreshIfNeeded.
async function handleSyncAll(base44) {
  const user = await base44.auth.me().catch(() => null);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });
  // Only 'connected' rows are synced; rows flagged 'expired' wait for the athlete to reconnect.
  const conns = await base44.asServiceRole.entities.CorosConnection.filter({ status: 'connected' });
  const results: any[] = [];
  for (const conn of conns) {
    if (!conn.access_token) continue;
    const athlete = await base44.asServiceRole.entities.AthleteProfile.get(conn.athlete_id).catch(() => null);
    if (!athlete) { results.push({ athlete_id: conn.athlete_id, skipped: 'athlete not found' }); continue; }

    const r: any = { athlete_id: conn.athlete_id };
    let accessToken: string;
    try { accessToken = await refreshIfNeeded(conn, base44, true); }
    catch (e) {
      await base44.asServiceRole.entities.CorosConnection.update(conn.id, { last_error: e.message });
      results.push({ athlete_id: conn.athlete_id, error: e.message });
      // Refresh token is dead (flagged 'expired' by refreshIfNeeded): tell the athlete once.
      const fresh = await base44.asServiceRole.entities.CorosConnection.get(conn.id).catch(() => null);
      if (fresh?.status === 'expired') await notifyReconnect(athlete, base44);
      continue;
    }
    try { r.historical = await syncHistoricalFor(athlete, accessToken, base44); } catch (e) { r.historical_error = e.message; }
    try { r.recovery = await syncRecoveryFor(athlete, accessToken, base44); } catch (e) { r.recovery_error = e.message; }
    const errMsg = [
      r.historical_error, r.recovery_error,
      r.historical?.errors || r.historical?.error_messages?.length ? 'Historical sync incomplete' : null,
      r.recovery?.errors || r.recovery?.toolErrors?.length ? 'Recovery sync incomplete' : null,
    ].filter(Boolean).join('; ');
    await base44.asServiceRole.entities.CorosConnection.update(conn.id, {
      last_sync_at: new Date().toISOString(),
      last_error: errMsg || '',
    });
    results.push(r);
  }
  return Response.json({ success: true, processed: results.length, results });
}

async function handleListTools(base44) {
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const athlete = await getOwnedAthlete(base44, user.id);
  if (!athlete) return Response.json({ error: 'No athlete profile found' }, { status: 404 });
  const conns = await base44.asServiceRole.entities.CorosConnection.filter({ athlete_id: athlete.id });
  const conn = conns[0];
  if (!conn || !conn.access_token) return Response.json({ error: 'COROS account not connected' }, { status: 409 });
  let accessToken;
  try { accessToken = await refreshIfNeeded(conn, base44); }
  catch (e) { return Response.json({ error: e.message }, { status: 502 }); }
  try {
    const init = await mcpPost(accessToken, null, {
      jsonrpc: '2.0', id: 1, method: 'initialize',
      params: { protocolVersion: MCP_PROTOCOL_VERSION, capabilities: {}, clientInfo: { name: 'TrainPaceLab', version: '1.0' } },
    });
    const sid = init.sessionId;
    if (!init.json || init.json.error) return Response.json({ error: 'MCP initialize failed', raw: init.raw, status: init.status });
    await mcpPost(accessToken, sid, { jsonrpc: '2.0', method: 'notifications/initialized', params: {} }, false);
    const list = await mcpPost(accessToken, sid, { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
    const tools = list.json?.result?.tools || [];
    const names = tools.map((t: any) => t.name);
    const sportRecords = tools.find((t: any) => t.name === 'querySportRecords');
    const recoveryTools = ['queryRecoveryStatus', 'querySleepHrv', 'queryRestingHeartRate', 'querySleepData', 'queryStressLevel', 'queryDailyHealthData'];
    const schemas: Record<string, any> = {};
    for (const tn of recoveryTools) {
      const t = tools.find((x: any) => x.name === tn);
      schemas[tn] = t?.inputSchema || null;
    }
    return Response.json({ allToolNames: names, recoverySchemas: schemas });
  } catch (e) { return Response.json({ error: e.message }, { status: 502 }); }
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

    // Browser OAuth redirect lands with ?code=...&state=... (GET).
    const u = new URL(req.url);
    if (u.searchParams.get('code') && u.searchParams.get('state')) {
      return await handleOAuthCallback(req, base44);
    }

    // App-user actions arrive as a JSON body { action, ... } from base44.functions.invoke (POST).
    const body = await req.json().catch(() => ({}));
    const action = body.action || u.searchParams.get('action');

    if (action === 'webhook' || req.headers.get('x-coros-signature')) {
      const innerReq = new Request(req.url, { method: 'POST', headers: req.headers, body: JSON.stringify(body) });
      return await handleWebhook(innerReq, base44);
    }
    if (action === 'authorize') return await handleAuthorize(req, base44);
    if (action === 'status') return await handleStatus(base44);
    if (action === 'sync_historical') return await handleSyncHistorical(base44);
    if (action === 'list_tools') return await handleListTools(base44);
    if (action === 'sync_recovery') return await handleSyncRecovery(base44);
    if (action === 'sync_all') return await handleSyncAll(base44);
    if (action === 'disconnect') return await handleDisconnect(base44);

    return Response.json({ error: `Unknown action: ${action || '(none)'}` }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});