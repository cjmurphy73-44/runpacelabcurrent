import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import fitParser from 'npm:fit-file-parser';

const GARMIN_EPOCH_OFFSET_SEC = 631065600; // seconds between Unix epoch and FIT/Garmin epoch (1989-12-31)
const VALID_SPORTS = ['running', 'cycling', 'swimming', 'strength', 'triathlon', 'other'];
const MAX_STREAM_SAMPLES = 3600;
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

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return null;
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const idx = (names) => {
    for (const n of names) {
      const i = headers.indexOf(n);
      if (i !== -1) return i;
    }
    return -1;
  };
  const hrIdx = idx(['heart_rate', 'hr', 'heartrate']);
  const powerIdx = idx(['power', 'watts']);
  const cadenceIdx = idx(['cadence', 'rpm']);
  const distIdx = idx(['distance', 'distance_m', 'distance_km']);
  const timeIdx = idx(['timestamp', 'time', 'elapsed_time']);
  const altIdx = idx(['altitude', 'elevation', 'ele']);
  const speedIdx = idx(['speed', 'speed_ms', 'velocity']);

  const stream = [];
  let firstTime = null;

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    const point = { time: null, heart_rate: null, altitude: null, distance: null, cadence: null, speed: null };

    if (timeIdx !== -1) {
      const raw = cols[timeIdx];
      let t = Date.parse(raw);
      if (isNaN(t)) {
        const n = parseFloat(raw);
        t = isNaN(n) ? null : n * 1000;
      }
      if (t !== null) {
        if (firstTime === null) firstTime = t;
        point.time = (t - firstTime) / 1000;
      }
    }
    if (point.time === null) point.time = i - 1;

    if (hrIdx !== -1) { const v = parseFloat(cols[hrIdx]); if (!isNaN(v)) point.heart_rate = v; }
    if (powerIdx !== -1) { const v = parseFloat(cols[powerIdx]); if (!isNaN(v)) point.power = v; }
    if (cadenceIdx !== -1) { const v = parseFloat(cols[cadenceIdx]); if (!isNaN(v)) point.cadence = v; }
    if (distIdx !== -1) { const v = parseFloat(cols[distIdx]); if (!isNaN(v)) point.distance = v; }
    if (altIdx !== -1) { const v = parseFloat(cols[altIdx]); if (!isNaN(v)) point.altitude = v; }
    if (speedIdx !== -1) { const v = parseFloat(cols[speedIdx]); if (!isNaN(v)) point.speed = v; }

    stream.push(point);
  }

  let hrSum = 0, hrCount = 0, hrMax = 0;
  let powerSum = 0, powerCount = 0;
  let cadenceSum = 0, cadenceCount = 0;
  let maxDistance = 0;
  for (const p of stream) {
    if (typeof p.heart_rate === 'number') { hrSum += p.heart_rate; hrCount++; hrMax = Math.max(hrMax, p.heart_rate); }
    if (typeof p.power === 'number') { powerSum += p.power; powerCount++; }
    if (typeof p.cadence === 'number') { cadenceSum += p.cadence; cadenceCount++; }
    if (typeof p.distance === 'number') maxDistance = Math.max(maxDistance, p.distance);
  }
  const durationSeconds = stream.length > 1 ? stream[stream.length - 1].time - stream[0].time : 0;
  let distanceKm = maxDistance;
  if (distanceKm > 1000) distanceKm = distanceKm / 1000;

  const derivedDate = firstTime !== null ? new Date(firstTime).toISOString().slice(0, 10) : null;

  const summary = {
    avg_hr: hrCount ? Math.round(hrSum / hrCount) : null,
    max_hr: hrMax || null,
    avg_power: powerCount ? Math.round(powerSum / powerCount) : null,
    avg_cadence: cadenceCount ? Math.round(cadenceSum / cadenceCount) : null,
    distance_km: distanceKm ? Math.round(distanceKm * 100) / 100 : null,
    duration_minutes: durationSeconds ? Math.round((durationSeconds / 60) * 100) / 100 : null,
    duration_seconds: durationSeconds ? Math.round(durationSeconds) : 0,
    derived_date: derivedDate,
  };

  return { summary, stream };
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
    : (records[0]?.timestamp instanceof Date ? records[0].timestamp : new Date());
  const localStart = new Date(startInstant.getTime() + tzOffsetMs);
  const derivedDate = localStart.toISOString().slice(0, 10);

  const summary = {
    avg_hr: avgHr,
    max_hr: maxHr,
    distance_km: Math.round(distanceKm * 100) / 100,
    duration_minutes: Math.round((durationSeconds / 60) * 100) / 100,
    duration_seconds: Math.round(durationSeconds),
    derived_date: derivedDate,
  };

  return { summary, stream: records };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { athlete_id, files, summaries, default_date } = await req.json();
    if (!athlete_id) {
      return Response.json({ error: 'athlete_id is required' }, { status: 400 });
    }
    const hasFiles = Array.isArray(files) && files.length > 0;
    const hasSummaries = Array.isArray(summaries) && summaries.length > 0;
    // An empty (or omitted) batch is a valid no-op, not a client error — avoids a spurious 400
    // when a caller submits [] after client-side filtering removed every row.
    if (!hasFiles && !hasSummaries) {
      return Response.json({ success: true, created_count: 0, errors: [] });
    }

    const athlete = await base44.entities.AthleteProfile.get(athlete_id);
    if (!athlete) return Response.json({ error: 'Athlete profile not found' }, { status: 404 });

    const restHr = athlete.resting_hr || 60;
    const maxHr = athlete.max_heart_rate || 190;

    // Dedup safeguard: skip any session matching an existing one (or one already staged in this batch)
    // on the same date/sport/duration/distance, preventing repeated-import inflation.
    const existingSessions = await base44.entities.WorkoutSession.filter({ athlete_id });
    const sessionsByDateAll = {};
    for (const s of existingSessions) (sessionsByDateAll[s.date] ||= []).push(s);
    const isDuplicateSession = (date, sport, durationMinutes, distanceKm) =>
      (sessionsByDateAll[date] || []).some((s) =>
        s.sport === sport &&
        Math.abs((s.duration_minutes || 0) - durationMinutes) < 1 &&
        Math.abs((s.distance_km || 0) - (distanceKm || 0)) < 0.1
      );

    const sessionsToCreate = [];
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
          if (!rowDate || isNaN(Date.parse(rowDate)) || durationMinutes <= 0 || durationMinutes > 1440 || !Number.isFinite(durationMinutes)) {
            errors.push({ file_name: row?.file_name || 'unknown', error: 'Missing date or invalid duration (>24h or non-positive)' });
            continue;
          }
          if (isDuplicateSession(rowDate, sessionSport, durationMinutes, distanceKm)) {
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
          };
          sessionsToCreate.push(newSession);
          (sessionsByDateAll[rowDate] ||= []).push(newSession);
        } catch (rowError) {
          errors.push({ file_name: row?.file_name || 'unknown', error: rowError.message });
        }
      }
    }

    for (const f of (files || [])) {
      try {
        const { file_url, file_name, sport } = f;
        if (!file_url || !file_name) {
          errors.push({ file_name: file_name || 'unknown', error: 'file_url and file_name are required' });
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
        } else if (lowerName.endsWith('.csv')) {
          sourceFormat = 'csv';
          const text = await fileRes.text();
          summaryRows = tryParseSummaryCsv(text);
          if (!summaryRows) parsedResult = parseCsv(text);
        } else {
          errors.push({ file_name, error: 'Unsupported file type, only .fit and .csv are supported' });
          continue;
        }

        if (summaryRows) {
          const fallbackSport = sport || 'running';
          for (const row of summaryRows) {
            const rowDate = row.date || default_date || f.date;
            const sessionSport = row.sport || fallbackSport;
            if (isDuplicateSession(rowDate, sessionSport, row.duration_minutes, row.distance_km)) {
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
            };
            sessionsToCreate.push(newSession);
            (sessionsByDateAll[rowDate] ||= []).push(newSession);
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
        if (isDuplicateSession(date, sessionSport, durationMinutes, distanceKm)) {
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
        if (parsed.avg_hr) {
          sessionTrimp = calcTrimp(durationMinutes, parsed.avg_hr, restHr, maxHr, athlete.sex);
        } else if (sessionSport === 'running' && athlete.functional_threshold_pace_ms && avg_ngp) {
          sessionTss = calcRTSS(parsed.duration_seconds, avg_ngp, athlete.functional_threshold_pace_ms);
        }

        const newSession = {
          athlete_id,
          date,
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
          efficiency_factor: efficiency_factor ?? undefined,
          aerobic_decoupling: aerobic_decoupling ?? undefined,
          streams: stream.length <= MAX_STREAM_SAMPLES ? stream.map((p) => ({
            time: p.time, heart_rate: p.heart_rate, altitude: p.altitude, distance: p.distance, cadence: p.cadence, speed: p.speed,
          })) : undefined,
        };
        sessionsToCreate.push(newSession);
        (sessionsByDateAll[date] ||= []).push(newSession);
      } catch (fileError) {
        errors.push({ file_name: f.file_name || 'unknown', error: fileError.message });
      }
    }

    if (sessionsToCreate.length === 0) {
      // Every row was invalid/duplicate/unparseable — a normal outcome of a batch import, not a bad request.
      return Response.json({ success: true, created_count: 0, errors });
    }

    const createdSessions = [];
    for (let i = 0; i < sessionsToCreate.length; i += 500) {
      const batch = sessionsToCreate.slice(i, i + 500);
      try {
        const created = await base44.entities.WorkoutSession.bulkCreate(batch);
        createdSessions.push(...created);
      } catch (batchError) {
        // Don't let one bad sub-batch fail the whole request — report it and keep going.
        for (const item of batch) {
          errors.push({ file_name: item.raw_file_url || item.date || 'unknown', error: `Insert failed: ${batchError.message}` });
        }
      }
    }

    if (createdSessions.length === 0) {
      return Response.json({ success: true, created_count: 0, errors });
    }

    // New ingestion model: raw files are simply appended to the master WorkoutSession log.
    // Downstream analysis — EarlyversionAIcoach evaluation and the CTL/ATL/TSB + daily-TRIMP
    // calculations — is run separately/on-demand against this log, not inline during the bulk
    // import. This keeps the batch resilient and free of the timeout/sequencing complications
    // that arose when coupling ingest to the recompute pipeline.
    return Response.json({
      success: true,
      successCount: createdSessions.length,
      errorCount: errors.length,
      created_count: createdSessions.length,
      affected_dates: [...new Set(createdSessions.map((s) => s.date))],
      errors,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});