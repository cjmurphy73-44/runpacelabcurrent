import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { VALID_SPORTS, calcTrimp, normalizeSport, getOwnedAthlete } from '../../shared/workoutIngest.ts';
import { env, hmacBase64Url } from '../../shared/oauth.ts';
import { normalizeCorosRecovery, ingestRecovery } from '../../shared/recoveryIngest.ts';

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

const MCP_RESOURCE = 'https://mcpus.coros.com/mcp';
const AUTHORIZE_ENDPOINT = 'https://mcpus.coros.com/oauth2/authorize';
const TOKEN_ENDPOINT = 'https://mcpus.coros.com/oauth2/token';
const SCOPE = 'openid mcp.tools offline_access';
const MCP_PROTOCOL_VERSION = '2025-06-18';

function getClientId(): string {
  return env('COROS_MCP_CLIENT_ID');
}

function selfUrl(req: Request): string {
  const url = new URL(req.url);
  return `${url.origin}${url.pathname}`;
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
  const sig = await hmacBase64Url(payload, getClientId() || 'coros-mcp-default-secret');
  return `${payload}.${sig}`;
}
async function parseState(state: string): Promise<{ athleteId: string | null; verifier: string | null; ok: boolean }> {
  const [payload, sig] = (state || '').split('.');
  if (!payload || !sig) return { athleteId: null, verifier: null, ok: false };
  if ((await hmacBase64Url(payload, getClientId() || 'coros-mcp-default-secret')) !== sig) return { athleteId: null, verifier: null, ok: false };
  const [athleteId, verifierB64] = payload.split('.');
  if (!athleteId || !verifierB64) return { athleteId, verifier: null, ok: false };
  try { return { athleteId, verifier: b64urlDecode(verifierB64), ok: true }; }
  catch { return { athleteId, verifier: null, ok: false }; }
}

async function fetchWithTimeout(url: string, opts: RequestInit, ms = 20000): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(url, { ...opts, signal: ctrl.signal }); }
  finally { clearTimeout(t); }
}

// ---- action handlers ----

// Browser redirect: COROS sends ?code=...&state=<athleteId>.<verifier>.<sig>. No user
// session (it's a redirect landing) so state is HMAC-verified and the owner resolved
// from the athlete profile's created_by_id.
async function handleOAuthCallback(req, base44) {
  const u = new URL(req.url);
  const code = u.searchParams.get('code');
  const state = u.searchParams.get('state') || '';
  if (!code) return Response.json({ error: 'Missing authorization code' }, { status: 400 });
  const { athleteId, verifier, ok } = await parseState(state);
  if (!ok || !athleteId || !verifier) return Response.json({ error: 'Invalid state' }, { status: 400 });

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
    return Response.json({ error: `Token exchange failed: ${tokenRes.status}`, details: txt }, { status: 502 });
  }
  const tok = await tokenRes.json();

  const athlete = await base44.asServiceRole.entities.AthleteProfile.get(athleteId).catch(() => null);
  if (!athlete) return Response.json({ error: 'Athlete profile not found' }, { status: 404 });

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

  const html = `<!doctype html><meta http-equiv="refresh" content="2;url=${u.origin}/settings"><body style="font-family:system-ui;padding:3rem"><h2>COROS connected</h2><p>Redirecting to your settings…</p></body>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html' } });
}

// Coros → us webhook delivery. No user session; authenticated by X-Coros-Signature == COROS_WEBHOOK_SECRET.
async function handleWebhook(req, base44) {
  const webhookSecret = env('COROS_WEBHOOK_SECRET');
  if (!webhookSecret) return Response.json({ error: 'Webhook secret not configured' }, { status: 503 });
  const sig = req.headers.get('x-coros-signature');
  if (!sig || sig !== webhookSecret) return Response.json({ error: 'Unauthorized' }, { status: 401 });
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

  try { await base44.asServiceRole.functions.invoke('calculateDailyTRIMP', { athlete_id: athleteId, date }); } catch (e) { console.warn('calculateDailyTRIMP failed:', e); }
  try { await base44.asServiceRole.functions.invoke('postWorkoutAIEvaluation', { athlete_id: athleteId, workout_session_id: session.id }); } catch (e) { console.warn('postWorkoutAIEvaluation failed:', e); }

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
  const params = new URLSearchParams({
    response_type: 'code',
    ...(getClientId() ? { client_id: getClientId() } : {}),
    redirect_uri: selfUrl(req),
    code_challenge: challenge,
    code_challenge_method: 'S256',
    scope: SCOPE,
    state,
  });
  return Response.json({ authorize_url: `${AUTHORIZE_ENDPOINT}?${params.toString()}` });
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

async function refreshIfNeeded(conn, base44): Promise<string> {
  const now = Date.now();
  const expiresAt = conn.token_expires_at ? Date.parse(conn.token_expires_at) : 0;
  if (expiresAt > now + 60_000 && conn.access_token) return conn.access_token;
  if (!conn.refresh_token) return conn.access_token || '';
  const clientId = getClientId();
  const r = await fetchWithTimeout(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: conn.refresh_token,
      ...(clientId ? { client_id: clientId } : {}),
    }),
  });
  if (!r.ok) throw new Error(`Token refresh failed: ${r.status}`);
  const tok = await r.json();
  const accessToken = tok.access_token || conn.access_token;
  await base44.asServiceRole.entities.CorosConnection.update(conn.id, {
    access_token: accessToken,
    refresh_token: tok.refresh_token || conn.refresh_token,
    token_expires_at: new Date(now + (tok.expires_in || 3600) * 1000).toISOString(),
  });
  return accessToken;
}

// ---- MCP JSON-RPC over Streamable HTTP ----
async function mcpPost(token: string, sessionId: string | null, body: any, acceptSse = true): Promise<{ json: any; sessionId: string | null; status: number; raw: string }> {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept': acceptSse ? 'application/json, text/event-stream' : 'application/json',
  };
  if (sessionId) headers['Mcp-Session-Id'] = sessionId;
  const r = await fetchWithTimeout(MCP_RESOURCE, { method: 'POST', headers, body: JSON.stringify(body) });
  const sid = r.headers.get('mcp-session-id') || sessionId;
  const text = await r.text();
  let json: any = null;
  const ct = r.headers.get('content-type') || '';
  if (ct.includes('event-stream')) {
    for (const line of text.split('\n')) {
      const m = line.match(/^data:\s*(.*)$/);
      if (m) { try { json = JSON.parse(m[1]); break; } catch { /* try next line */ } }
    }
  } else if (text) {
    try { json = JSON.parse(text); } catch { /* not JSON */ }
  }
  return { json, sessionId: sid, status: r.status, raw: text.slice(0, 1000) };
}

async function mcpToolCall(token: string, toolName: string, args: any): Promise<any> {
  const init = await mcpPost(token, null, {
    jsonrpc: '2.0', id: 1, method: 'initialize',
    params: { protocolVersion: MCP_PROTOCOL_VERSION, capabilities: {}, clientInfo: { name: 'TrainPaceLab', version: '1.0' } },
  });
  const sid = init.sessionId;
  if (!init.json || init.json.error) throw new Error(`MCP initialize failed: ${init.json?.error?.message || init.raw || `HTTP ${init.status}`}`);
  // notifications/initialized — no response expected; do not request SSE.
  await mcpPost(token, sid, { jsonrpc: '2.0', method: 'notifications/initialized', params: {} }, false);
  const call = await mcpPost(token, sid, {
    jsonrpc: '2.0', id: 2, method: 'tools/call',
    params: { name: toolName, arguments: args },
  });
  if (!call.json) throw new Error(`MCP tools/call returned no JSON: ${call.raw || `HTTP ${call.status}`}`);
  if (call.json.error) throw new Error(`MCP ${toolName} error: ${call.json.error.message || JSON.stringify(call.json.error)}`);
  return call.json.result;
}

// MCP tool results arrive as { content: [ { type: 'text', text: '<json>' } ] }.
function extractRecords(result: any): any[] {
  if (!result) return [];
  const content = result.content;
  if (Array.isArray(content)) {
    for (const item of content) {
      if (item.type === 'text' && item.text) {
        try {
          const parsed = JSON.parse(item.text);
          if (Array.isArray(parsed)) return parsed;
          return parsed.records || parsed.activities || parsed.data || parsed.list || (parsed.items ? parsed.items : [parsed]);
        } catch { /* not JSON text */ }
      }
      if (item.type === 'resource' && item.resource?.text) {
        try { const parsed = JSON.parse(item.resource.text); return Array.isArray(parsed) ? parsed : [parsed]; } catch { /* */ }
      }
    }
    return [];
  }
  return Array.isArray(result) ? result : [result];
}

// COROS MCP returns sport records as a formatted text report (not JSON). Parse it.
function corosSportCodeToSport(code: number | null, name: string): string {
  if (code != null) {
    if (code >= 100 && code <= 106) return 'running';
    if (code >= 200 && code <= 299) return 'cycling';
    if (code === 300 || code === 301) return 'swimming';
    if (code >= 400 && code <= 402) return 'strength';
  }
  const n = (name || '').toLowerCase();
  if (n.includes('run')) return 'running';
  if (n.includes('bike') || n.includes('cycl')) return 'cycling';
  if (n.includes('swim')) return 'swimming';
  if (n.includes('strength')) return 'strength';
  return 'other';
}

function parseCorosRecordsText(text: string): any[] {
  if (!text || typeof text !== 'string') return [];
  const records: any[] = [];
  // Each record block starts with "N. SportName — YYYY-MM-DD"
  const blocks = text.split(/(?=^\s*\d+\.\s+)/m);
  const headRe = /^\s*\d+\.\s+(.+?)\s+[—–-]\s+(\d{4}-\d{2}-\d{2})\s*$/;
  for (const block of blocks) {
    const head = block.match(headRe);
    if (!head) continue;
    const sportName = head[1].trim();
    const date = head[2];
    const durM = block.match(/Duration:\s*(\d{1,2}:\d{2}(?::\d{2})?)|Sets:\s*(\d+)/);
    const distM = block.match(/Distance:\s*([\d.]+)\s*km/i);
    const hrM = block.match(/Avg HR:\s*(\d+)\s*bpm/i);
    const sportTypeM = block.match(/SportType:\s*(\d+)/);
    const startM = block.match(/startTimestamp=(\d+)/);
    const endM = block.match(/endTimestamp=(\d+)/);
    let durationSeconds = 0;
    if (durM && durM[1]) {
      const p = durM[1].split(':').map(Number);
      durationSeconds = p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1];
    } else if (startM && endM) {
      durationSeconds = Number(endM[1]) - Number(startM[1]);
    }
    records.push({
      date,
      sport: corosSportCodeToSport(sportTypeM ? Number(sportTypeM[1]) : null, sportName),
      duration_seconds: durationSeconds,
      distance_km: distM ? Number(distM[1]) : 0,
      avg_heart_rate: hrM ? Number(hrM[1]) : null,
    });
  }
  return records;
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

  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 90);
  // COROS MCP requires yyyyMMdd (no dashes), and sportTypeCodes is mandatory — 65535 = all sports.
  const fmt = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '');

  let result;
  try {
    result = await mcpToolCall(accessToken, 'querySportRecords', { startDate: fmt(start), endDate: fmt(end), sportTypeCodes: [65535], limit: 100 });
  } catch (e) {
    await base44.asServiceRole.entities.CorosConnection.update(conn.id, { last_error: e.message });
    return Response.json({ error: e.message }, { status: 502 });
  }

  // COROS MCP returns sport records as a formatted text report — parse it; fall back to JSON extraction.
  let contentText = result?.content?.[0]?.text;
  if (typeof contentText === 'string') { try { contentText = JSON.parse(contentText); } catch { /* not JSON-encoded */ } }
  const isTextReport = typeof contentText === 'string' && /Sport Records\b/.test(contentText);
  const records = isTextReport
    ? parseCorosRecordsText(contentText)
    : extractRecords(result);
  const toCreate = [];
  let errors = 0;
  for (const a of records) {
    const mapped = mapRecord(a, athlete);
    if (!mapped) { errors++; continue; }
    const existing = await base44.asServiceRole.entities.WorkoutSession.filter({ athlete_id: athlete.id, date: mapped.date });
    const dup = existing.some((s) => s.sport === mapped.sport && Math.abs((s.duration_minutes || 0) - mapped.duration_minutes) < 1 && Math.abs((s.distance_km || 0) - mapped.distance_km) < 0.1);
    if (dup) continue;
    toCreate.push(mapped);
  }
  if (toCreate.length) {
    for (let i = 0; i < toCreate.length; i += 500) {
      await base44.asServiceRole.entities.WorkoutSession.bulkCreate(toCreate.slice(i, i + 500));
    }
  }
  const dates = [...new Set(toCreate.map((s) => s.date))];
  for (const d of dates) {
    try { await base44.asServiceRole.functions.invoke('calculateDailyTRIMP', { athlete_id: athlete.id, date: d }); } catch { /* keep going */ }
  }
  await base44.asServiceRole.entities.CorosConnection.update(conn.id, { last_sync_at: new Date().toISOString(), last_error: '' });
  return Response.json({ success: true, imported: toCreate.length, errors, records_found: records.length, isTextReport, contentTextHead: typeof contentText === 'string' ? contentText.slice(0, 300) : String(contentText), blocks: isTextReport ? contentText.split(/(?=^\s*\d+\.\s+)/m).length : 0, sampleParsed: records[0] || null });
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

  // Recovery is a recent-window pull (last 14 days). COROS MCP tool names for daily/recovery
  // data vary; try a small set of candidates and use the first that returns records.
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 14);
  const fmt = (d) => d.toISOString().slice(0, 10);

  const candidates = ['queryDailySummary', 'queryRecoveryReport', 'queryHealthReport', 'queryDailyReport', 'queryRecovery'];
  let records: any[] = [];
  let usedTool = '';
  let lastErr = '';
  for (const tool of candidates) {
    try {
      const result = await mcpToolCall(accessToken, tool, { startDate: fmt(start), endDate: fmt(end) });
      const recs = extractRecords(result);
      if (recs.length) { records = recs; usedTool = tool; break; }
    } catch (e) { lastErr = e.message; /* try next candidate */ }
  }
  if (!records.length) {
    await base44.asServiceRole.entities.CorosConnection.update(conn.id, { last_error: lastErr || 'No recovery data tool available on COROS MCP' });
    return Response.json({ error: lastErr || 'No COROS recovery data tool found', imported: 0 }, { status: 502 });
  }

  const history = await base44.asServiceRole.entities.DailyMetrics.filter({ athlete_id: athlete.id }, '-date', 30);
  let ingested = 0;
  let errors = 0;
  for (const r of records) {
    const normalized = normalizeCorosRecovery(r);
    if (!normalized) { errors++; continue; }
    try { await ingestRecovery(base44, athlete.id, normalized, 'coros', history); ingested++; } catch { errors++; }
  }
  await base44.asServiceRole.entities.CorosConnection.update(conn.id, { last_sync_at: new Date().toISOString(), last_error: '' });
  return Response.json({ success: true, imported: ingested, errors, tool: usedTool, records_found: records.length });
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
    const recovery = tools.find((t: any) => t.name === 'queryDailySummary' || t.name === 'queryRecoveryReport' || t.name === 'queryHealthReport' || t.name === 'queryDailyReport' || t.name === 'queryRecovery');
    return Response.json({ querySportRecordsSchema: sportRecords?.inputSchema || null, recoverySchema: recovery?.inputSchema || null, recoveryName: recovery?.name || null });
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
    if (action === 'disconnect') return await handleDisconnect(base44);

    return Response.json({ error: `Unknown action: ${action || '(none)'}` }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});