// base44/functions/backfillTelemetry/entry.ts
// Historical telemetry backfill. Walks every athlete's sessions that carry only a
// summary, re-parses their stored FIT/TCX/CSV files with the current parser, falls
// back to refetching the activity from Garmin when no file is stored, and finally
// recalculates CTL/ATL/TSB for the athletes whose records actually changed.
//
// Bounded and resumable: each call processes one chunk of sessions for one athlete
// and returns a (date, id) cursor so the caller can continue where it stopped.
// Sessions with no recoverable stream keep their available summary data and are
// reported as summary_only rather than failing the run.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { parseAssetFile, parseFitWithLaps, parseTcx, parseCsv, summarizeStream, SOURCE_PRIORITY } from '../../shared/workoutParsers.ts';
import { reconcileStreams, dominantFileType, recomputePhysiology } from '../../shared/streamReconcile.ts';
import { resolveTimeInZone } from '../../shared/hrZones.ts';
import { calcTrimp } from '../../shared/physiology.ts';
import { resolveSessionLoad } from '../../shared/loadModel.ts';
import { recomputeCTLATLTSB } from '../../shared/ctlRecalc.ts';
import { assertSafeFileUrl } from '../../shared/urlGuard.ts';
import { garminConfig, refreshGarminToken } from '../../shared/garminAuth.ts';
import { corosAccessToken, queryCorosRecords, downloadCorosFit } from '../../shared/corosMcp.ts';

const BATCH_SIZE = 25;
const MAX_STREAM_SAMPLES = 3600;

function storageStream(stream) {
  return stream.map((p) => ({
    time: p.time, heart_rate: p.heart_rate, altitude: p.altitude, distance: p.distance, cadence: p.cadence, speed: p.speed,
  }));
}

function hasUsableStream(session) {
  return Array.isArray(session.streams) && session.streams.length > 10;
}

// A session needs work when it holds a stale synthetic zone split to clear, or when it
// has no per-second stream but a raw file to refetch. A summary-only session with no
// attached file can never gain zones, so it is not re-scanned on every run.
function isCandidate(session) {
  if (session.zone_method === 'average' || session.zone_method === 'laps') return true;
  if (hasUsableStream(session)) return false;
  return Boolean(session.raw_file_url);
}

function typeFromName(name) {
  const n = String(name || '').toLowerCase();
  if (n.endsWith('.fit')) return 'fit';
  if (n.endsWith('.tcx')) return 'tcx';
  if (n.endsWith('.csv')) return 'csv';
  return null;
}

// A whole-activity CSV export has one row per session, not per second, and parseCsv
// happily turns those rows into a fake "stream". Before any of it is stored, the
// samples have to look like real telemetry: enough points, a plausible time span for
// the session, and at least one physiological channel actually populated.
function isUsableTelemetry(stream, durationSeconds) {
  if (!Array.isArray(stream) || stream.length < 60) return false;
  const times = stream.map((p) => Number(p.time)).filter((t) => Number.isFinite(t));
  if (times.length < stream.length * 0.9) return false;
  const span = Math.max(...times) - Math.min(...times);
  const maxSpan = Math.max((Number(durationSeconds) || 0) * 1.5, 60) + 300;
  if (span > maxSpan) return false;
  const withHr = stream.filter((p) => typeof p.heart_rate === 'number' && p.heart_rate > 0).length;
  const withPower = stream.filter((p) => typeof p.power === 'number' && p.power > 0).length;
  return withHr >= stream.length * 0.5 || withPower >= stream.length * 0.5;
}

function nameFromUrl(url, sourceFormat) {
  try {
    const base = decodeURIComponent(new URL(url).pathname.split('/').pop() || '');
    if (typeFromName(base)) return base;
  } catch { /* fall through */ }
  const ext = ['fit', 'tcx', 'csv'].includes(sourceFormat) ? sourceFormat : 'fit';
  return `backfill-source.${ext}`;
}

function looksLikeFit(bytes) {
  if (!bytes || bytes.length < 14) return false;
  return bytes[8] === 0x2e && bytes[9] === 0x46 && bytes[10] === 0x49 && bytes[11] === 0x54;
}

// Parse a file pulled straight from a provider (no stored file name to go on), so the
// format is sniffed from the bytes rather than trusted from a URL suffix.
async function parseDownloadedFile(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    if (looksLikeFit(buf)) {
      const parsed = parseFitWithLaps(buf);
      if (parsed?.stream?.length) return { fileType: 'fit', stream: parsed.stream, laps: parsed.laps || [] };
      return null;
    }
    const text = new TextDecoder().decode(buf);
    if (/<TrainingCenterDatabase/i.test(text)) {
      const parsed = parseTcx(text);
      if (parsed?.stream?.length) return { fileType: 'tcx', stream: parsed.stream, laps: parsed.laps || [] };
    }
    const parsedCsv = parseCsv(text);
    if (parsedCsv?.stream?.length) return { fileType: 'csv', stream: parsedCsv.stream, laps: parsedCsv.laps || [] };
    return null;
  } catch {
    return null;
  }
}

// Re-pull one historical activity from Garmin and read its original file, when the
// account still exposes one for that date. COROS exposes summary records only through
// its MCP interface, so it has no file to refetch and is reported as summary-only.
async function garminFileFor(base44, athlete, session) {
  const conns = await base44.asServiceRole.entities.GarminConnection.filter({ athlete_id: athlete.id });
  const conn = conns.find((c) => c.status === 'connected' && c.access_token);
  if (!conn) return null;
  const { apiBase, dataConfigured } = garminConfig();
  if (!dataConfigured) return null;

  let accessToken;
  try {
    ({ accessToken } = await refreshGarminToken(conn, base44));
  } catch {
    return null;
  }

  const res = await fetch(`${apiBase}/activities`, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) return null;
  const data = await res.json();
  const list = Array.isArray(data) ? data : (data.activities || data.items || data.data || []);
  const target = Number(session.duration_minutes) || 0;

  const match = list.find((a) => {
    const d = a.date || (a.start_time ? String(a.start_time).slice(0, 10) : null) || (a.timestamp ? String(a.timestamp).slice(0, 10) : null);
    if (d !== session.date) return false;
    const secs = Number(a.duration_seconds ?? a.duration ?? a.elapsed_time ?? 0);
    return Math.abs(secs / 60 - target) < 1.5;
  });
  if (!match) return null;

  const urls = [match.fit_file_url, match.file_url, match.download_url, match.activity_file_url].filter(Boolean);
  const activityId = match.activity_id || match.summaryId || match.id;
  if (activityId) urls.push(`${apiBase}/activities/${activityId}/file`);

  for (const url of urls) {
    if (!assertSafeFileUrl(url).ok) continue;
    const parsed = await parseDownloadedFile(url);
    if (parsed) return parsed;
  }
  return null;
}

// Re-pull one historical activity's original file from COROS. The MCP sport record is only
// a summary, but COROS keeps the watch's own recording for each record, which is where the
// second-by-second telemetry lives. Sessions whose recording no longer exists stay
// summary-only.
async function corosFileFor(base44, athlete, session) {
  const conns = await base44.asServiceRole.entities.CorosConnection.filter({ athlete_id: athlete.id });
  const conn = conns.find((c) => c.access_token && c.status !== 'disconnected');
  if (!conn) return null;

  let accessToken;
  try { accessToken = await corosAccessToken(conn, base44); } catch { return null; }

  const day = session.date;
  if (!day) return null;
  const fmt = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');
  const from = new Date(`${day}T00:00:00Z`); from.setDate(from.getDate() - 1);
  const to = new Date(`${day}T00:00:00Z`); to.setDate(to.getDate() + 1);

  let records;
  try { records = await queryCorosRecords(accessToken, fmt(from), fmt(to)); } catch { return null; }

  const targetMinutes = Number(session.duration_minutes) || 0;
  const candidates = records.filter((r) => r.label_id && r.date === day && (!r.sport || r.sport === session.sport));
  if (!candidates.length) return null;
  // A day can hold several sessions and the report duration is rounded, so the closest
  // duration wins rather than requiring an exact match.
  const best = candidates.reduce((a, b) =>
    Math.abs((a.duration_seconds || 0) / 60 - targetMinutes) <= Math.abs((b.duration_seconds || 0) / 60 - targetMinutes) ? a : b);
  if (Math.abs((best.duration_seconds || 0) / 60 - targetMinutes) > 5) return null;

  try { return await downloadCorosFit(accessToken, best.label_id, best.sport_type); } catch { return null; }
}

function sortKey(s) {
  return `${s.date || ''}|${s.id || ''}`;
}

async function loadSessions(base44, athlete_id) {
  const all = [];
  let cursorDate = null;
  for (let page = 0; page < 6; page++) {
    const query = cursorDate ? { athlete_id, date: { $gt: cursorDate } } : { athlete_id };
    const rows = await base44.asServiceRole.entities.WorkoutSession.filter(query, 'date', 500);
    const items = Array.isArray(rows) ? rows : rows?.items || [];
    all.push(...items);
    if (items.length < 500) break;
    cursorDate = items[items.length - 1].date;
  }
  return all;
}

async function processSession(base44, athlete, session, restHr, maxHr) {
  const assets = await base44.asServiceRole.entities.WorkoutAsset.filter({ session_id: session.id }).catch(() => []);
  const sources = [];
  for (const a of Array.isArray(assets) ? assets : []) {
    if (a?.file_url) sources.push({ file_url: a.file_url, file_name: a.file_name || '', file_type: a.file_type });
  }
  if (session.raw_file_url && !sources.some((s) => s.file_url === session.raw_file_url)) {
    const name = nameFromUrl(session.raw_file_url, session.source_format);
    sources.push({ file_url: session.raw_file_url, file_name: name, file_type: typeFromName(name) });
  }

  const durationMinutes = session.duration_minutes || (session.duration_seconds ? session.duration_seconds / 60 : 0);
  const durationSeconds = session.duration_seconds || Math.round(durationMinutes * 60);

  const payloads = [];
  for (const src of sources) {
    if (!assertSafeFileUrl(src.file_url).ok) continue;
    const parsed = await parseAssetFile(fetch, src);
    if (parsed && isUsableTelemetry(parsed.stream, durationSeconds)) payloads.push(parsed);
  }

  let fromProvider = false;
  if (payloads.length === 0) {
    for (const refetch of [garminFileFor, corosFileFor]) {
      const provider = await refetch(base44, athlete, session).catch(() => null);
      if (provider && isUsableTelemetry(provider.stream, durationSeconds)) {
        payloads.push(provider);
        fromProvider = true;
        break;
      }
    }
  }

  if (payloads.length === 0) {
    // Nothing full to recover. The session keeps its stored summary metrics, but it
    // never receives a zone distribution: zones require a real per-second stream, so
    // any previously estimated split is cleared instead of refreshed.
    const update: any = {};
    if (!session.session_trimp && !session.session_tss && session.avg_hr) {
      update.session_trimp = calcTrimp(durationMinutes, session.avg_hr, restHr, maxHr, athlete.sex);
      update.load_source = 'summary';
    }
    if (session.zone_method && session.zone_method !== 'none') {
      update.zone_seconds = [0, 0, 0, 0, 0];
      update.zone_method = 'none';
    }
    return { outcome: 'summary_only', updated: Object.keys(update).length > 0, update };
  }

  const { masterStream, masterLaps } = reconcileStreams(payloads);
  if (!isUsableTelemetry(masterStream, durationSeconds)) return { outcome: 'summary_only', updated: false };

  const summary = summarizeStream(masterStream);
  const avgHr = session.avg_hr || summary?.avg_hr || null;
  const sessionMaxHr = session.max_hr || summary?.max_hr || null;

  const zones = resolveTimeInZone({
    stream: masterStream, laps: masterLaps, avgHr, durationSeconds, restHr, maxHr,
  });
  const physio = recomputePhysiology(masterStream, session.sport, durationMinutes, avgHr);

  const update: any = {
    streams: storageStream(masterStream.slice(0, MAX_STREAM_SAMPLES)),
    zone_seconds: zones.zone_seconds,
    zone_method: zones.zone_method,
    zone_bounds_bpm: zones.zone_bounds_bpm,
    source_format: dominantFileType(payloads) || session.source_format || 'fit',
  };
  if (masterLaps.length > 0) update.laps = masterLaps;
  if (!session.avg_hr && avgHr) update.avg_hr = avgHr;
  if (!session.max_hr && sessionMaxHr) update.max_hr = sessionMaxHr;
  if (!session.avg_power && summary?.avg_power) update.avg_power = summary.avg_power;
  if (!session.avg_cadence && summary?.avg_cadence) update.avg_cadence = summary.avg_cadence;
  if (!session.distance_km && summary?.distance_km) update.distance_km = summary.distance_km;
  if (!session.aerobic_decoupling && physio.aerobic_decoupling !== null) update.aerobic_decoupling = physio.aerobic_decoupling;
  if (!session.efficiency_factor && physio.efficiency_factor !== null) update.efficiency_factor = physio.efficiency_factor;
  // Load provenance, not load duplication: a session whose load was estimated from its
  // average HR is upgraded to the per-second integral now that its recording exists, and
  // relabelled as measured. A session already integrated from a stream keeps its value, so
  // re-parsing never re-counts a session.
  if (session.load_source !== 'stream') {
    const streamLoad = resolveSessionLoad({
      stream: masterStream,
      durationSeconds,
      avgHr,
      restHr,
      maxHr,
      sex: athlete.sex,
    });
    if (streamLoad.load_source === 'stream') {
      update.session_trimp = streamLoad.session_trimp;
      update.session_tss = 0;
      update.load_source = 'stream';
      update.load_coverage_pct = streamLoad.load_coverage_pct;
    }
  }

  return { outcome: 'recovered', updated: true, update, fromProvider };
}

async function handlePreview(base44) {
  const athletes = await base44.asServiceRole.entities.AthleteProfile.list('-created_date', 200);
  const rows = Array.isArray(athletes) ? athletes : athletes?.items || [];
  const result = [];

  for (const athlete of rows) {
    const sessions = await loadSessions(base44, athlete.id);
    const candidates = sessions.filter(isCandidate);
    if (!candidates.length) continue;
    result.push({
      athlete_id: athlete.id,
      name: `${athlete.first_name || ''} ${athlete.last_name || ''}`.trim() || 'Athlete',
      candidates: candidates.length,
      with_file: candidates.filter((s) => Boolean(s.raw_file_url)).length,
    });
  }

  const totals = result.reduce(
    (acc, r) => ({ candidates: acc.candidates + r.candidates, with_file: acc.with_file + r.with_file }),
    { candidates: 0, with_file: 0 },
  );
  return Response.json({ success: true, athletes: result, totals });
}

async function handleRun(base44, athlete_id, cursor) {
  const athlete = await base44.asServiceRole.entities.AthleteProfile.get(athlete_id).catch(() => null);
  if (!athlete) return Response.json({ error: 'Athlete profile not found' }, { status: 404 });

  const restHr = athlete.resting_hr || 60;
  const maxHr = athlete.max_heart_rate || 190;

  const sessions = await loadSessions(base44, athlete_id);
  const cursorKey = cursor?.date ? `${cursor.date}|${cursor.id || ''}` : null;
  const candidates = sessions
    .filter(isCandidate)
    .sort((a, b) => sortKey(a).localeCompare(sortKey(b)))
    .filter((s) => !cursorKey || sortKey(s) > cursorKey);

  const chunk = candidates.slice(0, BATCH_SIZE);
  let recovered = 0;
  let summaryOnly = 0;
  let failed = 0;
  let touched = false;
  const errors = [];

  for (const session of chunk) {
    try {
      const res = await processSession(base44, athlete, session, restHr, maxHr);
      if (res.update && res.updated) {
        await base44.asServiceRole.entities.WorkoutSession.update(session.id, res.update);
        touched = true;
      }
      if (res.outcome === 'recovered') recovered++;
      else summaryOnly++;
    } catch (e) {
      failed++;
      errors.push({ session_id: session.id, date: session.date, error: e?.message || String(e) });
    }
  }

  let recalculated = null;
  if (touched) {
    try {
      recalculated = await recomputeCTLATLTSB(base44, athlete_id);
    } catch (e) {
      errors.push({ error: `Recalculation failed: ${e?.message || String(e)}` });
    }
  }

  const last = chunk[chunk.length - 1];
  return Response.json({
    success: true,
    sessions_scanned: chunk.length,
    streams_recovered: recovered,
    summary_only: summaryOnly,
    failed,
    has_more: candidates.length > chunk.length,
    next_cursor: last ? { date: last.date, id: last.id } : null,
    recalculated: recalculated ? { ctl: recalculated.ctl, atl: recalculated.atl, tsb: recalculated.tsb } : null,
    errors,
  });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'preview';

    if (action === 'preview') return await handlePreview(base44);
    if (action === 'run') {
      if (!body.athlete_id) return Response.json({ error: 'athlete_id is required' }, { status: 400 });
      return await handleRun(base44, body.athlete_id, body.cursor || null);
    }
    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('backfillTelemetry failed:', error?.message);
    return Response.json({ error: error?.message || 'Backfill failed' }, { status: 500 });
  }
});