import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import fitParser from 'npm:fit-file-parser';
import { TelemetryParser } from '../../shared/telemetryParser.ts';
import { assertSafeFileUrl } from '../../shared/urlGuard.ts';
import { assertOwnsAthlete } from '../../shared/ownership.ts';
import { reportError } from '../../shared/errorReport.ts';
import { resolveSessionLoad } from '../../shared/loadModel.ts';
import { inlineWorkoutStream } from '../../shared/streamValidity.ts';
import { parseCsv, parseTcx } from '../../shared/workoutParsers.ts';
import { VALID_WORKOUT_SPORTS as VALID_SPORTS } from '../../shared/workoutSports.ts';

const GARMIN_EPOCH_OFFSET_SEC = 631065600; // seconds between Unix epoch and FIT/Garmin epoch (1989-12-31)
const WARMUP_SECONDS = 300;
const MIN_DECOUPLING_DURATION_MIN = 45;

function calcTrimp(durationMin, avgHr, restHr, maxHr, sex) {
  if (!durationMin || !avgHr || !maxHr || maxHr <= restHr) return 0;
  const hrr = Math.max(0, Math.min(1, (avgHr - restHr) / (maxHr - restHr)));
  const isFemale = sex === 'female';
  const a = isFemale ? 0.86 : 0.64;
  const b = isFemale ? 1.67 : 1.92;
  return Math.round(durationMin * hrr * a * Math.exp(b * hrr) * 100) / 100;
}

// Maps a raw activity-type value from a wearable export (Coros, Garmin, etc.) to our sport enum.
// Returns null when the column is missing/unrecognized so callers can fall back to the user-selected sport.
function normalizeSportValue(raw) {
  if (!raw) return null;
  const s = String(raw).trim().toLowerCase();
  if (!s) return null;
  if (/walk/.test(s)) return 'walking';
  if (/run/.test(s)) return 'running';
  if (/(bike|cycl|ride|mtb)/.test(s)) return 'cycling';
  if (/swim/.test(s)) return 'swimming';
  if (/tri(athlon)?/.test(s)) return 'triathlon';
  if (/(strength|gym|weight|workout|hiit|core)/.test(s)) return 'strength';
  if (/(walk|hike|row|ski|elliptical|yoga|other)/.test(s)) return 'other';
  return 'other';
}

function gradeCostFactor(grade) {
  const s = Math.max(-0.45, Math.min(0.45, grade));
  const cf = 1 + 19 * s + 50.4 * s * s - 128.2 * s * s * s;
  return Math.max(0.5, Math.min(3, cf));
}

function computeNgpSeries(stream) {
  const series = [];
  for (let i = 1; i < stream.length; i++) {
    const prev = stream[i - 1];
    const cur = stream[i];
    const dTime = cur.time - prev.time;
    const dDist = (cur.distance ?? null) !== null && (prev.distance ?? null) !== null ? cur.distance - prev.distance : null;
    if (!dTime || dTime <= 0 || dDist === null || dDist <= 0) continue;
    const speed = cur.speed ?? (dDist / dTime);
    const dAlt = (cur.altitude ?? null) !== null && (prev.altitude ?? null) !== null ? cur.altitude - prev.altitude : 0;
    const grade = dDist > 0 ? dAlt / dDist : 0;
    const ngp = speed * gradeCostFactor(grade);
    series.push({ time: cur.time, ngp, hr: cur.heart_rate ?? null });
  }
  return series;
}

function average(values) {
  const valid = values.filter((v) => typeof v === 'number' && !isNaN(v));
  if (valid.length === 0) return null;
  return valid.reduce((s, v) => s + v, 0) / valid.length;
}

function computeDecouplingAndEF(ngpSeries, durationMinutes, avgHrFallback) {
  const overallEF = (() => {
    const avgNgp = average(ngpSeries.map((p) => p.ngp));
    const avgHr = average(ngpSeries.map((p) => p.hr)) ?? avgHrFallback;
    if (!avgNgp || !avgHr) return null;
    return Math.round((avgNgp / avgHr) * 10000) / 10000;
  })();

  if (durationMinutes < MIN_DECOUPLING_DURATION_MIN) {
    return { aerobic_decoupling: null, efficiency_factor: overallEF, avg_ngp: average(ngpSeries.map((p) => p.ngp)) };
  }

  const active = ngpSeries.filter((p) => p.time > WARMUP_SECONDS && p.hr);
  if (active.length < 10) {
    return { aerobic_decoupling: null, efficiency_factor: overallEF, avg_ngp: average(ngpSeries.map((p) => p.ngp)) };
  }

  const mid = Math.floor(active.length / 2);
  const half1 = active.slice(0, mid);
  const half2 = active.slice(mid);
  const ef1 = average(half1.map((p) => p.ngp)) / average(half1.map((p) => p.hr));
  const ef2 = average(half2.map((p) => p.ngp)) / average(half2.map((p) => p.hr));
  const decoupling = ef1 ? Math.round(((ef1 - ef2) / ef1) * 10000) / 100 : null;

  return { aerobic_decoupling: decoupling, efficiency_factor: overallEF, avg_ngp: average(ngpSeries.map((p) => p.ngp)) };
}

function calcRTSS(durationSeconds, avgNgp, ftPaceMs) {
  if (!durationSeconds || !avgNgp || !ftPaceMs) return 0;
  const intensityFactor = avgNgp / ftPaceMs;
  const rtss = (durationSeconds * avgNgp * intensityFactor) / (ftPaceMs * 3600) * 100;
  return Math.round(rtss * 100) / 100;
}

// Detects a per-workout summary export (one row = one whole activity, e.g. Coros/Garmin workout history
// exports with columns like total_duration_seconds/avg_heart_rate) as opposed to a per-second telemetry file.
// Treating each row as a telemetry sample of a single session produces physiologically impossible durations.
function tryParseSummaryCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 3) return null;
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const idx = (names) => {
    for (const n of names) {
      const i = headers.indexOf(n);
      if (i !== -1) return i;
    }
    return -1;
  };
  const durIdx = idx(['total_duration_seconds', 'duration_seconds']);
  const hrIdx = idx(['avg_heart_rate']);
  const maxHrIdx = idx(['max_heart_rate']);
  const distKmIdx = idx(['distance_km']);
  const distMIdx = idx(['total_distance_meters']);
  const tsIdx = idx(['timestamp', 'date', 'start_time']);
  const sportIdx = idx(['sport', 'activity_type', 'type', 'activity', 'workout_type']);
  if (durIdx === -1 || (hrIdx === -1 && distKmIdx === -1 && distMIdx === -1)) return null;

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    const durationSeconds = parseFloat(cols[durIdx]);
    if (!durationSeconds || durationSeconds < 60) continue;

    let distanceKm = null;
    if (distKmIdx !== -1) { const v = parseFloat(cols[distKmIdx]); if (!isNaN(v)) distanceKm = v; }
    else if (distMIdx !== -1) { const v = parseFloat(cols[distMIdx]); if (!isNaN(v)) distanceKm = v / 1000; }

    let avgHr = null;
    if (hrIdx !== -1) { const v = parseFloat(cols[hrIdx]); if (!isNaN(v)) avgHr = Math.round(v); }
    let maxHrVal = null;
    if (maxHrIdx !== -1) { const v = parseFloat(cols[maxHrIdx]); if (!isNaN(v)) maxHrVal = Math.round(v); }

    let rowDate = null;
    if (tsIdx !== -1) {
      const t = Date.parse(cols[tsIdx]);
      if (!isNaN(t)) rowDate = new Date(t).toISOString().slice(0, 10);
    }

    const rowSport = sportIdx !== -1 ? normalizeSportValue(cols[sportIdx]) : null;

    rows.push({
      date: rowDate,
      duration_seconds: Math.round(durationSeconds),
      duration_minutes: Math.round((durationSeconds / 60) * 100) / 100,
      distance_km: distanceKm !== null ? Math.round(distanceKm * 100) / 100 : null,
      avg_hr: avgHr,
      max_hr: maxHrVal,
      sport: rowSport,
    });
  }
  return rows.length > 0 ? rows : null;
}

// Helper to parse FIT file via fit-file-parser (already initialized)
// Hand-rolled decoder decodeFitRecords is deprecated and not called.

function parseFit(buffer) {
  const parser = new fitParser({
    force: true,
    speedUnit: 'm/s',
    lengthUnit: 'm',
    temperatureUnit: 'c',
    elapsedRecordField: true,
    mode: 'both',
  });

  let parsed = null;
  parser.parse(buffer, (error, data) => {
    if (error) {
      console.error('FIT Parsing Error:', error);
      return;
    }
    parsed = data;
  });

  if (!parsed) return null;

  // Prioritize session data (summary) if available
  const session = parsed.sessions && parsed.sessions.length > 0 ? parsed.sessions[0] : null;
  const records = parsed.records || [];

  // Duration: prefer the session's total_timer_time (seconds). Fall back to the spread between the
  // first and last record timestamps — but fit-file-parser returns record.timestamp as a Date, so the
  // raw difference is in MILLISECONDS and must be divided by 1000 to get seconds. (Treating ms as s and
  // then clamping the impossible result to 24h is what previously turned every fallback into a 24h run.)
  let durationSeconds = 0;
  if (typeof session?.total_timer_time === 'number' && session.total_timer_time > 0) {
    durationSeconds = session.total_timer_time;
  } else if (records.length > 1) {
    const firstTs = records[0].timestamp;
    const lastTs = records[records.length - 1].timestamp;
    const firstMs = firstTs instanceof Date ? firstTs.getTime() : Number(firstTs);
    const lastMs = lastTs instanceof Date ? lastTs.getTime() : Number(lastTs);
    const diffMs = lastMs - firstMs;
    if (diffMs > 0) durationSeconds = diffMs / 1000;
  }

  // No real workout exceeds 24 hours: an impossible duration means the file is corrupt or the
  // timestamps were misread, so reject it at the source instead of clamping and recording garbage.
  if (durationSeconds > 86400) return null;
  if (!Number.isFinite(durationSeconds) || durationSeconds < 0) durationSeconds = 0;

  const distanceKm = (session?.total_distance || 0) / 1000;
  
  // Ensure valid heart rate
  // GUARDRAIL: Only use heart rate > 0
  const avgHr = (session?.avg_heart_rate && session.avg_heart_rate > 0) ? session.avg_heart_rate : 
                 (records.length > 0 ? 
                    (() => {
                       const hrSamples = records.map(r => r.heart_rate).filter(hr => hr && hr > 0);
                       return hrSamples.length > 0 ? Math.round(hrSamples.reduce((acc, hr) => acc + hr, 0) / hrSamples.length) : null;
                    })() : null);
  
  const maxHr = (session?.max_heart_rate && session.max_heart_rate > 0) ? session.max_heart_rate : 
                 (records.length > 0 ? 
                    (() => {
                       const hrSamples = records.map(r => r.heart_rate).filter(hr => hr && hr > 0);
                       return hrSamples.length > 0 ? Math.max(...hrSamples) : null;
                    })() : null);

  // Derive the device's timezone offset from the first record carrying both a UTC timestamp and a
  // local_timestamp, so the calendar date reflects the athlete's local day rather than the FIT file's
  // raw UTC stamps (a 6am Brisbane run otherwise lands on the previous calendar day).
  let tzOffsetMs = 0;
  for (const r of records) {
    if (r?.local_timestamp instanceof Date && r?.timestamp instanceof Date) {
      tzOffsetMs = r.local_timestamp.getTime() - r.timestamp.getTime();
      break;
    }
  }
  const startInstant = session?.start_time instanceof Date ? session.start_time
    : (records[0]?.timestamp instanceof Date ? records[0].timestamp : null);
  const localStart = startInstant ? new Date(startInstant.getTime() + tzOffsetMs) : null;
  const derivedDate = localStart && Number.isFinite(localStart.getTime()) ? localStart.toISOString().slice(0, 10) : null;

  const firstRecordTime = records.find((record) => Number.isFinite(record.timestamp?.getTime?.()))?.timestamp;
  const stream = records
    .filter((record) => Number.isFinite(record.timestamp?.getTime?.()))
    .map((record) => ({ ...record, time: (record.timestamp.getTime() - firstRecordTime.getTime()) / 1000 }));

  const summary = {
    avg_hr: avgHr,
    max_hr: maxHr,
    distance_km: Math.round(distanceKm * 100) / 100,
    duration_minutes: Math.round((durationSeconds / 60) * 100) / 100,
    duration_seconds: Math.round(durationSeconds),
    derived_date: derivedDate,
    recording_started_at: Number.isFinite(startInstant?.getTime()) ? startInstant.toISOString() : undefined,
  };

  return { summary, stream };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { athlete_id, files, summaries, default_date } = body;

    // Explicit parameter validation — return a structured 400 naming the exact missing/malformed
    // field instead of a generic rejection, and log it server-side so the failure is traceable.
    if (!athlete_id || typeof athlete_id !== 'string') {
      const details = { athlete_id: athlete_id == null ? 'missing' : `expected string, got ${typeof athlete_id}` };
      console.warn('bulkIngestWorkouts: invalid parameters', details);
      return Response.json({ error: 'Invalid parameters', details }, { status: 400 });
    }
    if (!Array.isArray(files) && !Array.isArray(summaries)) {
      const details = { payload: 'either `files` (array of { file_url, file_name, sport? }) or `summaries` (array of { date, sport, duration_seconds, distance_km?, avg_hr?, max_hr? }) is required' };
      console.warn('bulkIngestWorkouts: invalid parameters', details);
      return Response.json({ error: 'Invalid parameters', details }, { status: 400 });
    }
    // Validate every raw-file entry's shape up front (the summaries path is validated per-row below).
    if (Array.isArray(files)) {
      for (const f of files) {
        if (!f || typeof f.file_url !== 'string' || typeof f.file_name !== 'string') {
          const details = { files: 'each file requires string `file_url` and string `file_name` (optional `sport`)', received: f ?? null };
          console.warn('bulkIngestWorkouts: invalid file entry', details);
          return Response.json({ error: 'Invalid parameters', details }, { status: 400 });
        }
      }
    }

    const hasFiles = Array.isArray(files) && files.length > 0;
    const hasSummaries = Array.isArray(summaries) && summaries.length > 0;
    // An empty (or omitted) batch is a valid no-op, not a client error — avoids a spurious 400
    // when a caller submits [] after client-side filtering removed every row.
    if (!hasFiles && !hasSummaries) {
      return Response.json({ success: true, created_count: 0, errors: [] });
    }

    if (!(await assertOwnsAthlete(base44, user, athlete_id))) return Response.json({ error: 'Not your athlete profile' }, { status: 403 });
    const athlete = await base44.entities.AthleteProfile.get(athlete_id).catch(() => null);
    if (!athlete) return Response.json({ error: 'Athlete profile not found' }, { status: 404 });

    const restHr = athlete.resting_hr || 60;
    const maxHr = athlete.max_heart_rate || 190;

    const stagedByDate = Object.create(null);
    const candidates = [];
    const errors = [];

    // Pre-compiled summary rows (extracted client-side in the browser from .fit/.csv files),
    // sent directly instead of raw file_urls — skips server-side fetch/parse entirely.
    if (hasSummaries) {
      for (const row of summaries) {
        try {
          const rowDate = row?.date;
          const sessionSport = VALID_SPORTS.includes(row?.sport) ? row.sport : 'running';
          // No clamp: a duration over 24h is impossible in reality, so treat it as a parse error and
          // reject the row outright rather than silently capping it to a 24h workout.
          const durationMinutes = row?.duration_seconds ? row.duration_seconds / 60 : (row?.duration_minutes || 0);
          const distanceKm = row?.distance_km || 0;
          // Reject anything under 1 minute as a bogus/empty session (matches the client parser's
          // 60s floor) — a real workout never this short, and these were polluting the log.
          if (!rowDate || isNaN(Date.parse(rowDate)) || durationMinutes < 1 || durationMinutes > 1440 || !Number.isFinite(durationMinutes)) {
            errors.push({ file_name: row?.file_name || 'unknown', error: 'Missing date or invalid duration (under 1 min or over 24h)' });
            continue;
          }
          if (TelemetryParser.isDuplicate(stagedByDate, rowDate, sessionSport, durationMinutes, distanceKm)) {
            errors.push({ file_name: row?.file_name || 'unknown', error: `Skipped duplicate workout on ${rowDate}` });
            continue;
          }
          const maxHrForRow = maxHr || row.max_hr || 190;
          const sessionTrimp = row.avg_hr ? calcTrimp(durationMinutes, row.avg_hr, restHr, maxHrForRow, athlete.sex) : 0;
          const newSession = {
            athlete_id,
            date: rowDate,
            sport: sessionSport,
            duration_minutes: Math.round(durationMinutes * 100) / 100,
            duration_seconds: row.duration_seconds || Math.round(durationMinutes * 60),
            distance_km: Math.round(distanceKm * 100) / 100,
            avg_hr: row.avg_hr || undefined,
            max_hr: row.max_hr || undefined,
            source_format: row.source_format || 'csv',
            session_trimp: sessionTrimp,
            load_source: row.avg_hr ? 'summary' : 'none',
          };
          const sanitizedSession = TelemetryParser.sanitize(newSession);
          if (!sanitizedSession) { errors.push({ file_name: row?.file_name || 'unknown', error: 'Sanitization rejected invalid session (date/duration out of range)' }); continue; }
          candidates.push({ session: sanitizedSession, fileName: row?.file_name || rowDate });
          (stagedByDate[rowDate] ||= []).push(sanitizedSession);
        } catch (rowError) {
          errors.push({ file_name: row?.file_name || 'unknown', error: rowError.message });
        }
      }
    }

    for (const f of (Array.isArray(files) ? files : [])) {
      try {
        const { file_url, file_name, sport } = f;
        if (!file_url || !file_name) {
          errors.push({ file_name: file_name || 'unknown', error: 'file_url and file_name are required' });
          continue;
        }
        const urlCheck = assertSafeFileUrl(file_url);
        if (!urlCheck.ok) {
          errors.push({ file_name, error: 'file_url not allowed' });
          continue;
        }
        const fileRes = await fetch(file_url);
        if (!fileRes.ok) {
          errors.push({ file_name, error: 'Could not fetch file' });
          continue;
        }

        const lowerName = file_name.toLowerCase();
        let parsedResult = null;
        let sourceFormat = 'csv';
        let summaryRows = null;
        if (lowerName.endsWith('.fit')) {
          sourceFormat = 'fit';
          const buffer = new Uint8Array(await fileRes.arrayBuffer());
          parsedResult = parseFit(buffer);
        } else if (lowerName.endsWith('.tcx')) {
          sourceFormat = 'tcx';
          parsedResult = parseTcx(await fileRes.text());
        } else if (lowerName.endsWith('.csv')) {
          sourceFormat = 'csv';
          const text = await fileRes.text();
          summaryRows = tryParseSummaryCsv(text);
          if (!summaryRows) parsedResult = parseCsv(text);
        } else {
          errors.push({ file_name, error: 'Unsupported file type. Use FIT, TCX or CSV.' });
          continue;
        }

        if (summaryRows) {
          const fallbackSport = sport || 'running';
          for (const row of summaryRows) {
            const rowDate = row.date || default_date || f.date;
            const sessionSport = row.sport || fallbackSport;
            if (TelemetryParser.isDuplicate(stagedByDate, rowDate, sessionSport, row.duration_minutes, row.distance_km)) {
              errors.push({ file_name, error: `Skipped duplicate workout on ${rowDate}` });
              continue;
            }
            const maxHrForRow = maxHr || row.max_hr || 190;
            const sessionTrimp = row.avg_hr ? calcTrimp(row.duration_minutes, row.avg_hr, restHr, maxHrForRow, athlete.sex) : 0;
            const newSession = {
              athlete_id,
              date: rowDate,
              sport: sessionSport,
              duration_minutes: row.duration_minutes,
              duration_seconds: row.duration_seconds,
              distance_km: row.distance_km || 0,
              avg_hr: row.avg_hr || undefined,
              max_hr: row.max_hr || undefined,
              source_format: sourceFormat,
              raw_file_url: file_url,
              session_trimp: sessionTrimp,
              load_source: row.avg_hr ? 'summary' : 'none',
            };
            const sanitizedSession = TelemetryParser.sanitize(newSession);
            if (!sanitizedSession) { errors.push({ file_name, error: 'Sanitization rejected invalid session (date/duration out of range)' }); continue; }
            candidates.push({ session: sanitizedSession, fileName: file_name });
            (stagedByDate[rowDate] ||= []).push(sanitizedSession);
          }
          continue;
        }

        if (!parsedResult) {
          errors.push({ file_name, error: 'Could not parse any telemetry from file' });
          continue;
        }
        const { summary: parsed, stream } = parsedResult;

        const durationMinutes = parsed.duration_minutes || 0;
        const distanceKm = parsed.distance_km || 0;
        if (durationMinutes < 1 || (distanceKm <= 0 && durationMinutes <= 0)) {
          errors.push({ file_name, error: 'Invalid record (zero distance/duration or under 60 seconds)' });
          continue;
        }

        const date = parsed.derived_date || default_date || f.date;
        if (!date) {
          errors.push({ file_name, error: 'Could not derive a date from file content and none was provided' });
          continue;
        }
        // Allow for the athlete's local day being up to ~14h ahead of UTC, so a same-day local workout
        // is not falsely rejected as future-dated.
        const maxAllowedDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        if (date > maxAllowedDate) {
          errors.push({ file_name, error: 'date cannot be in the future' });
          continue;
        }

        const sessionSport = sport || 'running';
        if (TelemetryParser.isDuplicate(stagedByDate, date, sessionSport, durationMinutes, distanceKm, parsed.recording_started_at)) {
          errors.push({ file_name, error: `Skipped duplicate workout on ${date}` });
          continue;
        }
        // Discipline-specific series: running uses pace-graded NGP, cycling uses raw power; other sports
        // (strength/swim/other) get no EF/decoupling since neither series is physiologically meaningful there.
        let aerobic_decoupling = null;
        let efficiency_factor = null;
        let avg_ngp = null;
        if (sessionSport === 'running') {
          const ngpSeries = computeNgpSeries(stream);
          ({ aerobic_decoupling, efficiency_factor, avg_ngp } = computeDecouplingAndEF(ngpSeries, durationMinutes, parsed.avg_hr));
        } else if (sessionSport === 'cycling') {
          const powerSeries = stream
            .filter((p) => typeof p.power === 'number' && typeof p.time === 'number')
            .map((p) => ({ time: p.time, ngp: p.power, hr: p.heart_rate ?? null }));
          ({ aerobic_decoupling, efficiency_factor } = computeDecouplingAndEF(powerSeries, durationMinutes, parsed.avg_hr));
        }

        let sessionTrimp = 0;
        let sessionTss = 0;
        let loadSource = 'none';
        let loadCoverage = 0;
        const resolvedLoad = resolveSessionLoad({
          stream,
          durationSeconds: parsed.duration_seconds || Math.round(durationMinutes * 60),
          avgHr: parsed.avg_hr,
          restHr,
          maxHr,
          sex: athlete.sex,
        });
        sessionTrimp = resolvedLoad.session_trimp;
        loadSource = resolvedLoad.load_source;
        loadCoverage = resolvedLoad.load_coverage_pct;
        if (!sessionTrimp && sessionSport === 'running' && athlete.functional_threshold_pace_ms && avg_ngp) {
          sessionTss = calcRTSS(parsed.duration_seconds, avg_ngp, athlete.functional_threshold_pace_ms);
          loadSource = 'stream';
        }

        const newSession = {
          athlete_id,
          date,
          recording_started_at: parsed.recording_started_at || undefined,
          sport: sessionSport,
          duration_minutes: durationMinutes,
          duration_seconds: parsed.duration_seconds || Math.round(durationMinutes * 60),
          distance_km: distanceKm,
          avg_hr: parsed.avg_hr || undefined,
          max_hr: parsed.max_hr || undefined,
          avg_power: parsed.avg_power || undefined,
          avg_cadence: parsed.avg_cadence || undefined,
          source_format: sourceFormat,
          raw_file_url: file_url,
          session_trimp: sessionTrimp,
          session_tss: sessionTss,
          load_source: loadSource,
          load_coverage_pct: loadCoverage,
          efficiency_factor: efficiency_factor ?? undefined,
          aerobic_decoupling: aerobic_decoupling ?? undefined,
          streams: inlineWorkoutStream(stream),
          ...(parsedResult.laps?.length ? { laps: parsedResult.laps.slice(0, 200) } : {}),
        };
        const sanitizedSession = TelemetryParser.sanitize(newSession);
        if (!sanitizedSession) { errors.push({ file_name, error: 'Sanitization rejected invalid session (date/duration out of range)' }); continue; }
        candidates.push({ session: sanitizedSession, fileName: file_name });
        (stagedByDate[date] ||= []).push(sanitizedSession);
      } catch (fileError) {
        errors.push({ file_name: f.file_name || 'unknown', error: fileError.message });
      }
    }

    // Match against existing sessions only on the days being imported. Page
    // through those days so old workouts deduplicate without downloading streams.
    const savedByDate = Object.create(null);
    const dateKeys = Object.keys(stagedByDate);
    const pageSize = 500;
    for (let dateOffset = 0; dateOffset < dateKeys.length; dateOffset += 100) {
      const date = { $in: dateKeys.slice(dateOffset, dateOffset + 100) };
      for (let skip = 0; ; skip += pageSize) {
        const rows = await base44.entities.WorkoutSession.filter(
          { athlete_id, date }, 'id', pageSize, skip, ['date', 'sport', 'duration_minutes', 'distance_km', 'recording_started_at'],
        );
        for (const row of rows) (savedByDate[row.date] ||= []).push(row);
        if (rows.length < pageSize) break;
      }
    }
    const sessionsToCreate = [];
    for (const { session, fileName } of candidates) {
      if (TelemetryParser.isDuplicate(savedByDate, session.date, session.sport, session.duration_minutes, session.distance_km, session.recording_started_at)) {
        errors.push({ file_name: fileName, error: `Skipped duplicate workout on ${session.date}` });
      } else {
        sessionsToCreate.push(session);
      }
    }

    if (sessionsToCreate.length === 0) {
      // Duplicates are expected skips; invalid/unparseable inputs are failures.
      const duplicate_count = errors.filter((e) => /^Skipped duplicate workout/.test(e.error || '')).length;
      const failed_count = errors.length - duplicate_count;
      return Response.json({
        success: failed_count === 0,
        outcome: failed_count > 0 ? 'failed' : 'skipped',
        created_count: 0,
        duplicate_count,
        failed_count,
        errors,
      });
    }

    const createdSessions = [];
    for (let i = 0; i < sessionsToCreate.length; i += 500) {
      const batch = sessionsToCreate.slice(i, i + 500);
      try {
        const created = await base44.entities.WorkoutSession.bulkCreate(batch);
        createdSessions.push(...created);
      } catch {
        // The service may have persisted some rows before the response failed.
        for (const { date } of batch) {
          errors.push({
            file_name: date,
            error: 'Workout could not be confirmed. Check Workouts before retrying.',
          });
        }
      }
    }

    if (createdSessions.length === 0) {
      const duplicate_count = errors.filter((e) => /^Skipped duplicate workout/.test(e.error || '')).length;
      return Response.json({
        success: false,
        outcome: 'failed',
        created_count: 0,
        duplicate_count,
        failed_count: errors.length - duplicate_count,
        errors,
      });
    }

    // The import page refreshes training load once after all its upload batches finish.
    const duplicate_count = errors.filter((e) => /^Skipped duplicate workout/.test(e.error || '')).length;
    const failed_count = errors.length - duplicate_count;
    return Response.json({
      // Never claim a completely successful import if any input failed to persist.
      // Partial batches keep saved sessions and disclose failures for safe retries.
      success: failed_count === 0,
      outcome: failed_count > 0 ? 'partial' : 'completed',
      successCount: createdSessions.length,
      errorCount: failed_count,
      created_count: createdSessions.length,
      ...(createdSessions.length === 1 ? { workout_session_id: createdSessions[0]?.id } : {}),
      duplicate_count,
      failed_count,
      affected_dates: [...new Set(createdSessions.map((s) => s.date))],
      errors,
    });
  } catch (error) {
    try { await reportError(base44, { source: 'bulkIngestWorkouts', message: error.message, stack: error.stack, severity: 'High' }); } catch {}
    return Response.json({ error: error.message }, { status: 500 });
  }
});
