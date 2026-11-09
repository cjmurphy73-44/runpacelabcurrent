// base44/shared/corosMcp.ts
// COROS MCP (Model Context Protocol) client plumbing shared by corosSync and the
// historical telemetry backfill. Owns the OAuth refresh, the JSON-RPC transport, the
// sport-record report parser and the FIT download, so both functions request full
// telemetry the same way instead of one of them settling for summaries.
//
// COROS exposes the original activity file, which is what makes real per-second
// streams possible:
//   queryActivityFitFileDownloadUrls  → original .fit download URL(s) for one activity
//   downloadActivityFitFiles          → the same file as an MCP binary resource
// An activity's LabelId + SportType (both present in the querySportRecords report) are
// what those endpoints need. Plain module, no Deno.serve.

import { env } from './oauth.ts';
import { parseFitWithLaps } from './workoutParsers.ts';
import { assertSafeFileUrl } from './urlGuard.ts';
import { readBoundedRecording, recordingProvenance, RecordingStorageError } from './recordingStorage.ts';

export const COROS_MCP_RESOURCE = 'https://mcpus.coros.com/mcp';
export const COROS_TOKEN_ENDPOINT = 'https://mcpus.coros.com/oauth2/token';
export const COROS_MCP_PROTOCOL_VERSION = '2025-06-18';

export function corosClientId(): string {
  return env('COROS_MCP_CLIENT_ID');
}

export async function fetchWithTimeout(url: string, opts: RequestInit, ms = 20000): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(url, { ...opts, signal: ctrl.signal }); }
  finally { clearTimeout(t); }
}

// Refresh the access token when it is close to expiring. `force` re-authorizes even when
// the current token is still valid (the scheduled sync does this so a rotated refresh
// token is always persisted). A rejected refresh token can never recover on its own, so
// the connection is flagged 'expired' and the athlete is asked to reconnect.
export async function corosAccessToken(conn, base44, force = false): Promise<string> {
  const now = Date.now();
  const expiresAt = conn.token_expires_at ? Date.parse(conn.token_expires_at) : 0;
  if (!force && expiresAt > now + 60_000 && conn.access_token) return conn.access_token;
  if (!conn.refresh_token) return conn.access_token || '';
  const clientId = corosClientId();
  const r = await fetchWithTimeout(COROS_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: conn.refresh_token,
      ...(clientId ? { client_id: clientId } : {}),
    }),
  });
  if (!r.ok) {
    const errText = await r.text().catch(() => '');
    if (r.status === 400 || r.status === 401 || /invalid_grant/i.test(errText)) {
      await base44.asServiceRole.entities.CorosConnection.update(conn.id, {
        status: 'expired',
        last_error: 'COROS authorization expired. Please reconnect your COROS account.',
      });
      throw new Error('COROS authorization expired. Please reconnect your COROS account.');
    }
    throw new Error(`Token refresh failed: ${r.status}`);
  }
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
export async function mcpPost(token: string, sessionId: string | null, body: any, acceptSse = true): Promise<{ json: any; sessionId: string | null; status: number; raw: string }> {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept': acceptSse ? 'application/json, text/event-stream' : 'application/json',
  };
  if (sessionId) headers['Mcp-Session-Id'] = sessionId;
  const r = await fetchWithTimeout(COROS_MCP_RESOURCE, { method: 'POST', headers, body: JSON.stringify(body) });
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

export async function mcpToolCall(token: string, toolName: string, args: any): Promise<any> {
  const init = await mcpPost(token, null, {
    jsonrpc: '2.0', id: 1, method: 'initialize',
    params: { protocolVersion: COROS_MCP_PROTOCOL_VERSION, capabilities: {}, clientInfo: { name: 'TrainPaceLab', version: '1.0' } },
  });
  const sid = init.sessionId;
  if (!init.json || init.json.error) throw new Error(`MCP initialize failed: ${init.json?.error?.message || init.raw || `HTTP ${init.status}`}`);
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
export function extractRecords(result: any): any[] {
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

export function corosSportCodeToSport(code: number | null, name: string): string {
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

// COROS MCP returns sport records as a formatted text report (not JSON). Each block also
// carries LabelId + SportType, which are the keys the FIT download tools require, so they
// are kept on the parsed record.
export function parseCorosRecordsText(text: string): any[] {
  if (!text || typeof text !== 'string') return [];
  const records: any[] = [];
  const headRe = /(\d+)\.\s+([^\n]+?)\s+[—–-]\s+(\d{4}-\d{2}-\d{2})/g;
  const heads: { index: number; sportName: string; date: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = headRe.exec(text)) !== null) {
    heads.push({ index: m.index, sportName: m[2].trim(), date: m[3] });
  }
  for (let i = 0; i < heads.length; i++) {
    const start = heads[i].index;
    const end = i + 1 < heads.length ? heads[i + 1].index : text.length;
    const block = text.slice(start, end);
    const durM = block.match(/Duration:\s*(\d{1,2}:\d{2}(?::\d{2})?)/);
    const distM = block.match(/Distance:\s*([\d.]+)\s*km/i);
    const hrM = block.match(/Avg HR:\s*(\d+)\s*bpm/i);
    const sportTypeM = block.match(/SportType:\s*(\d+)/);
    const labelM = block.match(/LabelId:\s*(\d+)/);
    const calM = block.match(/Calories:\s*([\d.]+)\s*kcal/i);
    const tempM = block.match(/(?:Temperature|Avg Temp):\s*(-?[\d.]+)\s*°?C/i);
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
      date: heads[i].date,
      sport: corosSportCodeToSport(sportTypeM ? Number(sportTypeM[1]) : null, heads[i].sportName),
      duration_seconds: durationSeconds,
      distance_km: distM ? Number(distM[1]) : 0,
      avg_heart_rate: hrM ? Number(hrM[1]) : null,
      calories: calM ? Number(calM[1]) : null,
      temperature_c: tempM ? Number(tempM[1]) : null,
      label_id: labelM ? labelM[1] : null,
      sport_type: sportTypeM ? Number(sportTypeM[1]) : null,
    });
  }
  return records;
}

// Pull the sport-record report for a date range (yyyyMMdd, no dashes) and parse it.
export async function queryCorosRecords(accessToken: string, startDate: string, endDate: string, limit = 100): Promise<any[]> {
  const result = await mcpToolCall(accessToken, 'querySportRecords', {
    startDate, endDate, sportTypeCodes: [65535], limit,
  });
  let contentText = result?.content?.[0]?.text;
  if (typeof contentText === 'string') { try { contentText = JSON.parse(contentText); } catch { /* not JSON-encoded */ } }
  return (typeof contentText === 'string' && /Sport Records\b/.test(contentText))
    ? parseCorosRecordsText(contentText)
    : extractRecords(result);
}

// The download-URL tool answers with a short text list: file name on one line, https URL
// on the next. Only the https URLs on COROS storage are used.
export function fitUrlsFromText(text: string): string[] {
  if (!text || typeof text !== 'string') return [];
  return [...text.matchAll(/https:\/\/[^\s"')]+\.fit/gi)].map((m) => m[0]);
}

// Download and parse one activity's original FIT file. Returns null when COROS has no
// file for the activity or the file does not decode — the caller then keeps the summary.
export async function downloadCorosFit(accessToken: string, labelId: string | number, sportType: number | string | null): Promise<{ fileType: string; stream: any[]; laps: any[]; provenance: any } | null> {
  if (!labelId) return null;
  let urls: string[] = [];
  try {
    const result = await mcpToolCall(accessToken, 'queryActivityFitFileDownloadUrls', {
      labelId: String(labelId),
      ...(sportType != null ? { sportType: Number(sportType) } : {}),
    });
    const text = result?.content?.map((c) => c.text || '').join('\n') || '';
    urls = fitUrlsFromText(text);
  } catch (e) {
    console.warn('COROS FIT URL lookup failed:', (e as Error).message);
    return null;
  }

  for (const url of urls) {
    if (!assertSafeFileUrl(url).ok) continue;
    try {
      const res = await fetchWithTimeout(url, {}, 30000);
      if (!res.ok) continue;
      const buf = await readBoundedRecording(res);
      // FIT header: bytes 8..12 spell ".FIT"; anything else is not a decodable activity file.
      const isFit = buf.length > 14 && buf[8] === 0x2e && buf[9] === 0x46 && buf[10] === 0x49 && buf[11] === 0x54;
      if (!isFit) continue;
      const parsed = parseFitWithLaps(buf);
      if (parsed?.stream?.length) return {
        fileType: 'fit', stream: parsed.stream, laps: parsed.laps || [],
        provenance: await recordingProvenance(buf, parsed.stream, parsed.laps || [], 'coros_fit'),
      };
    } catch (e) {
      if (e instanceof RecordingStorageError) throw e;
      console.warn('COROS FIT download failed:', (e as Error).message);
    }
  }
  return null;
}
