import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const MAX_STREAM_SAMPLES = 3600; // cap stored streams (~1hr @1Hz) to avoid oversized records
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

// Minetti metabolic cost formula: scales raw speed to a flat-land-equivalent Normalized Graded Pace.
function gradeCostFactor(grade) {
  const s = Math.max(-0.45, Math.min(0.45, grade));
  const cf = 1 + 19 * s + 50.4 * s * s - 128.2 * s * s * s;
  return Math.max(0.5, Math.min(3, cf));
}

// Builds a { time, ngp, hr } series from a raw telemetry stream using altitude/distance deltas.
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

// Aerobic Decoupling (Pa:HR) + overall Efficiency Factor from an NGP series.
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

// rTSS fallback (GPS/pace-based) when heart rate is unavailable.
function calcRTSS(durationSeconds, avgNgp, ftPaceMs) {
  if (!durationSeconds || !avgNgp || !ftPaceMs) return 0;
  const intensityFactor = avgNgp / ftPaceMs;
  const rtss = (durationSeconds * avgNgp * intensityFactor) / (ftPaceMs * 3600) * 100;
  return Math.round(rtss * 100) / 100;
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
    if (point.time === null) point.time = i - 1; // fallback: assume 1Hz sampling

    if (hrIdx !== -1) { const v = parseFloat(cols[hrIdx]); if (!isNaN(v)) point.heart_rate = v; }
    if (powerIdx !== -1) { const v = parseFloat(cols[powerIdx]); if (!isNaN(v)) point.power = v; }
    if (cadenceIdx !== -1) { const v = parseFloat(cols[cadenceIdx]); if (!isNaN(v)) point.cadence = v; }
    if (distIdx !== -1) { const v = parseFloat(cols[distIdx]); if (!isNaN(v)) point.distance = v > 1000 ? v : v; }
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

  const summary = {
    avg_hr: hrCount ? Math.round(hrSum / hrCount) : null,
    max_hr: hrMax || null,
    avg_power: powerCount ? Math.round(powerSum / powerCount) : null,
    avg_cadence: cadenceCount ? Math.round(cadenceSum / cadenceCount) : null,
    distance_km: distanceKm ? Math.round(distanceKm * 100) / 100 : null,
    duration_minutes: durationSeconds ? Math.round((durationSeconds / 60) * 100) / 100 : null,
    duration_seconds: durationSeconds ? Math.round(durationSeconds) : 0,
  };

  return { summary, stream };
}

function baseTypeSize(baseType) {
  const t = baseType & 0x1F;
  if (t === 3 || t === 4 || t === 11) return 2;
  if (t === 5 || t === 6 || t === 8 || t === 12) return 4;
  if (t === 9 || t === 14 || t === 15 || t === 16) return 8;
  return 1;
}

function decodeFitRecords(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const headerSize = view.getUint8(0);
  let offset = headerSize;
  const localDefs = {};
  const records = [];

  while (offset < bytes.byteLength - 2) {
    const recordHeader = view.getUint8(offset);
    offset += 1;
    const isDefinition = (recordHeader & 0x40) !== 0;
    const localMesgType = (recordHeader & 0x80) !== 0 ? (recordHeader >> 5) & 0x3 : recordHeader & 0xF;

    if (isDefinition) {
      offset += 1;
      const arch = view.getUint8(offset); offset += 1;
      const littleEndian = arch === 0;
      const globalMesgNum = view.getUint16(offset, littleEndian); offset += 2;
      const numFields = view.getUint8(offset); offset += 1;
      const fields = [];
      for (let i = 0; i < numFields; i++) {
        fields.push({ fieldNum: view.getUint8(offset), size: view.getUint8(offset + 1), baseType: view.getUint8(offset + 2) });
        offset += 3;
      }
      if (recordHeader & 0x20) {
        const numDevFields = view.getUint8(offset); offset += 1;
        offset += numDevFields * 3;
      }
      localDefs[localMesgType] = { globalMesgNum, fields, littleEndian };
    } else {
      const def = localDefs[localMesgType];
      if (!def) break;
      const rec = {};
      for (const f of def.fields) {
        const t = f.baseType & 0x1F;
        let value = null;
        if (t !== 7 && f.size === baseTypeSize(f.baseType)) {
          if (t === 2 || t === 10) value = view.getUint8(offset);
          else if (t === 1) value = view.getInt8(offset);
          else if (t === 4 || t === 11) value = view.getUint16(offset, def.littleEndian);
          else if (t === 3) value = view.getInt16(offset, def.littleEndian);
          else if (t === 6 || t === 12) value = view.getUint32(offset, def.littleEndian);
          else if (t === 5) value = view.getInt32(offset, def.littleEndian);
          else if (t === 8) value = view.getFloat32(offset, def.littleEndian);
          else if (t === 9) value = view.getFloat64(offset, def.littleEndian);
        }
        if (def.globalMesgNum === 20 && value !== null) {
          if (f.fieldNum === 253) rec.timestamp = value;
          if (f.fieldNum === 3 && value !== 0xFF) rec.heart_rate = value;
          if (f.fieldNum === 4 && value !== 0xFF) rec.cadence = value;
          if (f.fieldNum === 5 && value !== 0xFFFFFFFF) rec.distance = value / 100;
          if (f.fieldNum === 7 && value !== 0xFFFF) rec.power = value;
          if (f.fieldNum === 2 && value !== 0xFFFF) rec.altitude = value / 5 - 500;
          if (f.fieldNum === 6 && value !== 0xFFFF) rec.speed = value / 1000;
        }
        offset += f.size;
      }
      if (def.globalMesgNum === 20 && Object.keys(rec).length > 0) records.push(rec);
    }
  }
  return records;
}

// Detects a per-workout summary export (one row = one whole activity, e.g. Coros/Garmin workout history
// exports with columns like total_duration_seconds/avg_heart_rate) as opposed to a per-second telemetry file.
// Treating each row as a telemetry sample of a single session is what produced the ~776,000 minute bug.
function tryParseSummaryCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 3) return null; // need at least 2 data rows to be worth treating as a multi-session summary
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

    rows.push({
      date: rowDate,
      duration_seconds: Math.round(durationSeconds),
      duration_minutes: Math.round((durationSeconds / 60) * 100) / 100,
      distance_km: distanceKm !== null ? Math.round(distanceKm * 100) / 100 : null,
      avg_hr: avgHr,
      max_hr: maxHrVal,
    });
  }
  return rows.length > 0 ? rows : null;
}

function parseFit(bytes) {
  const records = decodeFitRecords(bytes);
  if (!records || records.length === 0) return null;

  const withTimestamps = records.filter((r) => typeof r.timestamp === 'number');
  if (withTimestamps.length === 0) return null;
  const firstTs = Math.min(...withTimestamps.map((r) => r.timestamp));

  const stream = records
    .filter((r) => typeof r.timestamp === 'number')
    .map((r) => ({
      time: r.timestamp - firstTs,
      heart_rate: typeof r.heart_rate === 'number' ? r.heart_rate : null,
      altitude: typeof r.altitude === 'number' ? r.altitude : null,
      distance: typeof r.distance === 'number' ? r.distance : null,
      cadence: typeof r.cadence === 'number' ? r.cadence : null,
      speed: typeof r.speed === 'number' ? r.speed : null,
      power: typeof r.power === 'number' ? r.power : null,
    }))
    .sort((a, b) => a.time - b.time);

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

  const summary = {
    avg_hr: hrCount ? Math.round(hrSum / hrCount) : null,
    max_hr: hrMax || null,
    avg_power: powerCount ? Math.round(powerSum / powerCount) : null,
    avg_cadence: cadenceCount ? Math.round(cadenceSum / cadenceCount) : null,
    distance_km: maxDistance ? Math.round((maxDistance / 1000) * 100) / 100 : null,
    duration_minutes: durationSeconds ? Math.round((durationSeconds / 60) * 100) / 100 : null,
    duration_seconds: durationSeconds ? Math.round(durationSeconds) : 0,
  };

  return { summary, stream };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { athlete_id, file_url, file_name, sport, date } = await req.json();
    if (!athlete_id || !file_url || !file_name || !date) {
      return Response.json({ error: 'athlete_id, file_url, file_name and date are required' }, { status: 400 });
    }
    if (new Date(date) > new Date()) {
      return Response.json({ error: 'date cannot be in the future' }, { status: 400 });
    }

    const fileRes = await fetch(file_url);
    if (!fileRes.ok) return Response.json({ error: 'Could not fetch uploaded file' }, { status: 400 });

    const lowerName = file_name.toLowerCase();
    let parsedResult = null;
    let sourceFormat = 'csv';
    if (lowerName.endsWith('.fit')) {
      sourceFormat = 'fit';
      const buffer = new Uint8Array(await fileRes.arrayBuffer());
      parsedResult = parseFit(buffer);
    } else if (lowerName.endsWith('.csv')) {
      sourceFormat = 'csv';
      const text = await fileRes.text();

      const summaryRows = tryParseSummaryCsv(text);
      if (summaryRows) {
        const athlete = await base44.entities.AthleteProfile.get(athlete_id);
        if (!athlete) return Response.json({ error: 'Athlete profile not found' }, { status: 404 });
        const restHr = athlete.resting_hr || 60;
        const profileMaxHr = athlete.max_heart_rate;
        const sessionSport = sport || 'running';

        // Dedup safeguard: skip rows that match an existing session on the same date/sport/duration/distance
        // (prevents re-imports of the same export file from inflating training load, as happened previously).
        const existingForDedup = await base44.entities.WorkoutSession.filter({ athlete_id });
        const existingByDate = {};
        for (const s of existingForDedup) (existingByDate[s.date] ||= []).push(s);
        const isDuplicateRow = (row) => (existingByDate[row.date || date] || []).some((s) =>
          s.sport === sessionSport &&
          Math.abs((s.duration_minutes || 0) - row.duration_minutes) < 1 &&
          Math.abs((s.distance_km || 0) - (row.distance_km || 0)) < 0.1
        );
        const dedupedRows = summaryRows.filter((row) => !isDuplicateRow(row));
        const skippedDuplicates = summaryRows.length - dedupedRows.length;

        const sessionsToCreate = dedupedRows.map((row) => {
          const maxHr = profileMaxHr || row.max_hr || 190;
          const sessionTrimp = row.avg_hr ? calcTrimp(row.duration_minutes, row.avg_hr, restHr, maxHr, athlete.sex) : 0;
          return {
            athlete_id,
            date: row.date || date,
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
        });

        if (sessionsToCreate.length === 0) {
          return Response.json({ success: true, imported_sessions_count: 0, skipped_duplicates: skippedDuplicates, affected_dates: [] });
        }

        const created = await base44.entities.WorkoutSession.bulkCreate(sessionsToCreate);
        const affectedDates = [...new Set(created.map((s) => s.date))];

        // Recompute total_trimp per affected day in-memory (single read of all sessions/metrics) to avoid
        // one DB round-trip per date, which rate-limits/times out on multi-row summary imports.
        const allSessions = await base44.entities.WorkoutSession.filter({ athlete_id });
        const trimpByDate = {};
        for (const s of allSessions) {
          if (!affectedDates.includes(s.date)) continue;
          trimpByDate[s.date] = (trimpByDate[s.date] || 0) + (s.session_trimp || s.session_tss || 0);
        }
        const allMetrics = await base44.entities.DailyMetrics.filter({ athlete_id });
        const metricsByDate = {};
        for (const m of allMetrics) metricsByDate[m.date] = m;

        const metricsToUpdate = [];
        const metricsToCreate = [];
        for (const d of affectedDates) {
          const totalTrimp = Math.round((trimpByDate[d] || 0) * 100) / 100;
          if (metricsByDate[d]) {
            metricsToUpdate.push({ id: metricsByDate[d].id, total_trimp: totalTrimp });
          } else {
            metricsToCreate.push({ athlete_id, date: d, total_trimp: totalTrimp });
          }
        }
        if (metricsToUpdate.length > 0) await base44.entities.DailyMetrics.bulkUpdate(metricsToUpdate);
        if (metricsToCreate.length > 0) await base44.entities.DailyMetrics.bulkCreate(metricsToCreate);

        await base44.functions.invoke('recalculateCTLATLTSB', { athlete_id });
        return Response.json({ success: true, imported_sessions_count: created.length, skipped_duplicates: skippedDuplicates, affected_dates: affectedDates });
      }

      parsedResult = parseCsv(text);
    } else {
      return Response.json({ error: 'Unsupported file type, only .fit and .csv are supported' }, { status: 400 });
    }

    if (!parsedResult) return Response.json({ error: 'Could not parse any telemetry from file' }, { status: 400 });
    const { summary: parsed, stream } = parsedResult;

    const durationMinutes = parsed.duration_minutes || 0;
    const distanceKm = parsed.distance_km || 0;
    if (durationMinutes < 1 || (distanceKm <= 0 && durationMinutes <= 0)) {
      return Response.json({ error: 'File discarded: invalid record (zero distance/duration or under 60 seconds)' }, { status: 400 });
    }

    const athlete = await base44.entities.AthleteProfile.get(athlete_id);
    if (!athlete) return Response.json({ error: 'Athlete profile not found' }, { status: 404 });

    const restHr = athlete.resting_hr || 60;
    const maxHr = athlete.max_heart_rate || parsed.max_hr || 190;
    const sessionSport = sport || 'running';

    // Dedup safeguard: reject a single-session upload if a matching session already exists for this date.
    const existingSessions = await base44.entities.WorkoutSession.filter({ athlete_id, date });
    const isDuplicate = existingSessions.some((s) =>
      s.sport === sessionSport &&
      Math.abs((s.duration_minutes || 0) - durationMinutes) < 1 &&
      Math.abs((s.distance_km || 0) - distanceKm) < 0.1
    );
    if (isDuplicate) {
      return Response.json({ error: 'A matching workout already exists for this date, sport, duration and distance', skipped: true }, { status: 409 });
    }

    // Physiological series (NGP/power) are discipline-specific: running uses pace-graded NGP, cycling uses
    // raw power. Other disciplines (strength/swim/other) have no comparable series, so EF/decoupling stay null
    // rather than being computed from irrelevant speed data.
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

    const session = await base44.entities.WorkoutSession.create({
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
    });

    await base44.functions.invoke('calculateDailyTRIMP', { athlete_id, date });
    await base44.functions.invoke('postWorkoutAIEvaluation', { athlete_id, workout_session_id: session.id });

    return Response.json({ success: true, workout_session: session });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});