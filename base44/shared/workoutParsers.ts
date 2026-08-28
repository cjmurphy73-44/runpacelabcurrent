// base44/shared/workoutParsers.ts
// Per-format workout file parsers (FIT, TCX, CSV) shared by the ingestion pipeline
// and the multi-asset reconciliation engine. Each parser returns a uniform shape:
//   { summary, stream, laps }
// where `stream` is a second-by-second array and `laps` is an array of lap/split
// segments (FIT lap message 19 / TCX <Lap>). Plain module — no Deno.serve.
// Import from a function entry via:
//   import { parseFitWithLaps, parseTcx, parseCsv, tryParseSummaryCsv, summarizeStream } from '../../shared/workoutParsers.ts';

export const SOURCE_PRIORITY = { fit: 4, tcx: 3, csv: 2, manual: 1 };

function baseTypeSize(baseType) {
  const t = baseType & 0x1F;
  if (t === 3 || t === 4 || t === 11) return 2;
  if (t === 5 || t === 6 || t === 8 || t === 12) return 4;
  if (t === 9 || t === 14 || t === 15 || t === 16) return 8;
  return 1;
}

// Decode the file-header + definition/data records of a FIT binary blob. Collects
// BOTH record (global message 20) and lap (global message 19) messages as raw
// per-field maps so consumers can apply their own scaling. Returns { records, laps }.
function decodeFit(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const headerSize = view.getUint8(0);
  let offset = headerSize;
  const localDefs = {};
  const records = [];
  const laps = [];

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
        if (value !== null) rec[f.fieldNum] = value;
        offset += f.size;
      }
      if (def.globalMesgNum === 20 && Object.keys(rec).length > 0) records.push(rec);
      else if (def.globalMesgNum === 19 && Object.keys(rec).length > 0) laps.push(rec);
    }
  }
  return { records, laps };
}

// Derive a uniform summary from a stream whose `distance` channel is in METERS
// (used by FIT and TCX; CSV keeps its own legacy summary below).
export function summarizeStream(stream) {
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
  return {
    avg_hr: hrCount ? Math.round(hrSum / hrCount) : null,
    max_hr: hrMax || null,
    avg_power: powerCount ? Math.round(powerSum / powerCount) : null,
    avg_cadence: cadenceCount ? Math.round(cadenceSum / cadenceCount) : null,
    distance_km: maxDistance ? Math.round((maxDistance / 1000) * 100) / 100 : null,
    duration_minutes: durationSeconds ? Math.round((durationSeconds / 60) * 100) / 100 : null,
    duration_seconds: durationSeconds ? Math.round(durationSeconds) : 0,
  };
}

export function parseFitWithLaps(bytes) {
  const { records, laps: rawLaps } = decodeFit(bytes);
  if (!records || records.length === 0) return null;

  const withTimestamps = records.filter((r) => typeof r[253] === 'number');
  if (withTimestamps.length === 0) return null;
  const firstTs = Math.min(...withTimestamps.map((r) => r[253]));

  const stream = records
    .filter((r) => typeof r[253] === 'number')
    .map((r) => ({
      time: r[253] - firstTs,
      heart_rate: (r[3] !== undefined && r[3] !== 0xFF) ? r[3] : null,
      altitude: (r[2] !== undefined && r[2] !== 0xFFFF) ? (r[2] / 5 - 500) : null,
      distance: (r[5] !== undefined && r[5] !== 0xFFFFFFFF) ? (r[5] / 100) : null, // meters
      cadence: (r[4] !== undefined && r[4] !== 0xFF) ? r[4] : null,
      speed: (r[6] !== undefined && r[6] !== 0xFFFF) ? (r[6] / 1000) : null, // m/s
      power: (r[7] !== undefined && r[7] !== 0xFFFF) ? r[7] : null,
    }))
    .sort((a, b) => a.time - b.time);

  // Lap message 19 field scaling: total_elapsed_time(8)/1000, total_distance(5)/100,
  // avg_speed(3)/1000, avg_heart_rate(14), max_heart_rate(15), start_time(7) absolute epoch.
  const laps = rawLaps.map((raw, i) => {
    const duration = (typeof raw[8] === 'number' ? raw[8] : (typeof raw[9] === 'number' ? raw[9] : 0)) / 1000;
    let startOffset;
    if (typeof raw[7] === 'number') startOffset = raw[7] - firstTs;
    else if (typeof raw[253] === 'number') startOffset = Math.max(0, raw[253] - firstTs - duration);
    else startOffset = 0;
    const distMeters = typeof raw[5] === 'number' ? raw[5] / 100 : null;
    return {
      lap_index: i,
      start_time_offset_s: Math.max(0, Math.round(startOffset * 100) / 100),
      duration_s: Math.round(duration * 100) / 100,
      distance_km: distMeters !== null ? Math.round((distMeters / 1000) * 100) / 100 : null,
      avg_hr: (typeof raw[14] === 'number' && raw[14] !== 0xFF) ? raw[14] : null,
      max_hr: (typeof raw[15] === 'number' && raw[15] !== 0xFF) ? raw[15] : null,
      avg_speed: (typeof raw[3] === 'number' && raw[3] !== 0xFFFF) ? Math.round((raw[3] / 1000) * 100) / 100 : null,
    };
  }).filter((l) => l.duration_s > 0 || l.distance_km !== null);

  return { summary: summarizeStream(stream), stream, laps };
}

// TCX is XML. We parse it with a lightweight, dependency-free regex pass over the
// predictable <Lap>/<Trackpoint> structure (Garmin/Wahoo exports are stable). A full
// DOM parser isn't available in the Deno runtime and avoids an npm dependency.
export function parseTcx(text) {
  const lapBlocks = [...text.matchAll(/<Lap\b[^>]*>[\s\S]*?<\/Lap>/g)];
  if (lapBlocks.length === 0) return null;

  const laps = [];
  const stream = [];
  let firstTimeMs = null;
  let lapIndex = 0;

  for (const lm of lapBlocks) {
    const lapBlock = lm[0];
    const startAttr = lapBlock.match(/<Lap\b[^>]*StartTime="([^"]+)"/);
    const lapStartMs = startAttr ? Date.parse(startAttr[1]) : null;
    const totalSeconds = parseFloat((lapBlock.match(/<TotalTimeSeconds>([0-9.]+)<\/TotalTimeSeconds>/) || [])[1]);
    const distanceMeters = parseFloat((lapBlock.match(/<DistanceMeters>([0-9.]+)<\/DistanceMeters>/) || [])[1]);
    const avgHrMatch = lapBlock.match(/<AverageHeartRateBpm>\s*<Value>(\d+)<\/Value>/);
    const maxHrMatch = lapBlock.match(/<MaximumHeartRateBpm>\s*<Value>(\d+)<\/Value>/);
    const avgSpeedMatch = lapBlock.match(/<AverageSpeed>([0-9.]+)<\/AverageSpeed>/);
    const tpMatches = [...lapBlock.matchAll(/<Trackpoint\b[\s\S]*?<\/Trackpoint>/g)];

    for (const tpm of tpMatches) {
      const tp = tpm[0];
      const timeStr = (tp.match(/<Time>([^<]+)<\/Time>/) || [])[1];
      const tMs = timeStr ? Date.parse(timeStr) : null;
      if (tMs === null || isNaN(tMs)) continue;
      if (firstTimeMs === null) firstTimeMs = tMs;
      const time = (tMs - firstTimeMs) / 1000;
      const hrRaw = (tp.match(/<HeartRateBpm>\s*<Value>(\d+)<\/Value>/) || [])[1];
      const cadenceRaw = (tp.match(/<Cadence>(\d+)<\/Cadence>/) || [])[1];
      const distRaw = (tp.match(/<DistanceMeters>([0-9.]+)<\/DistanceMeters>/) || [])[1];
      const altRaw = (tp.match(/<AltitudeMeters>([0-9.\-]+)<\/AltitudeMeters>/) || [])[1];
      const speedRaw = (tp.match(/<Speed>([0-9.]+)<\/Speed>/) || [])[1];
      const wattsRaw = (tp.match(/<Watts>([0-9.]+)<\/Watts>/) || [])[1];
      stream.push({
        time: Math.round(time * 100) / 100,
        heart_rate: hrRaw ? parseInt(hrRaw, 10) : null,
        altitude: altRaw ? parseFloat(altRaw) : null,
        distance: distRaw ? parseFloat(distRaw) : null, // meters
        cadence: cadenceRaw ? parseInt(cadenceRaw, 10) : null,
        speed: speedRaw ? parseFloat(speedRaw) : null,
        power: wattsRaw ? parseFloat(wattsRaw) : null,
      });
    }

    let lapOffset = 0;
    if (lapStartMs !== null && firstTimeMs !== null) lapOffset = (lapStartMs - firstTimeMs) / 1000;
    else if (stream.length > 0) lapOffset = stream[stream.length - 1].time - (isNaN(totalSeconds) ? 0 : totalSeconds);

    laps.push({
      lap_index: lapIndex,
      start_time_offset_s: Math.max(0, Math.round(lapOffset * 100) / 100),
      duration_s: isNaN(totalSeconds) ? null : Math.round(totalSeconds * 100) / 100,
      distance_km: isNaN(distanceMeters) ? null : Math.round((distanceMeters / 1000) * 100) / 100,
      avg_hr: avgHrMatch ? parseInt(avgHrMatch[1], 10) : null,
      max_hr: maxHrMatch ? parseInt(maxHrMatch[1], 10) : null,
      avg_speed: avgSpeedMatch ? Math.round(parseFloat(avgSpeedMatch[1]) * 100) / 100 : null,
    });
    lapIndex++;
  }

  if (stream.length === 0) return null;
  return { summary: summarizeStream(stream), stream, laps };
}

export function parseCsv(text) {
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

  const summary = {
    avg_hr: hrCount ? Math.round(hrSum / hrCount) : null,
    max_hr: hrMax || null,
    avg_power: powerCount ? Math.round(powerSum / powerCount) : null,
    avg_cadence: cadenceCount ? Math.round(cadenceSum / cadenceCount) : null,
    distance_km: distanceKm ? Math.round(distanceKm * 100) / 100 : null,
    duration_minutes: durationSeconds ? Math.round((durationSeconds / 60) * 100) / 100 : null,
    duration_seconds: durationSeconds ? Math.round(durationSeconds) : 0,
  };

  return { summary, stream, laps: [] };
}

// Detects a per-workout summary export (one row = one whole activity) as opposed to
// a per-second telemetry file — treating each row as a telemetry sample is what
// historically produced the ~776,000 minute bug.
export function tryParseSummaryCsv(text) {
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

// Re-fetch + re-parse a stored asset's file by its file_type. Returns null if the
// fetch/parse fails so reconciliation can simply skip that asset.
export async function parseAssetFile(fetchFn, asset) {
  try {
    const res = await fetchFn(asset.file_url);
    if (!res.ok) return null;
    const lower = (asset.file_name || '').toLowerCase();
    let parsed = null;
    if (lower.endsWith('.fit') || asset.file_type === 'fit') parsed = parseFitWithLaps(new Uint8Array(await res.arrayBuffer()));
    else if (lower.endsWith('.tcx') || asset.file_type === 'tcx') parsed = parseTcx(await res.text());
    else parsed = parseCsv(await res.text());
    if (!parsed || !parsed.stream || parsed.stream.length === 0) return null;
    return { fileType: asset.file_type, stream: parsed.stream, laps: parsed.laps || [] };
  } catch (e) {
    return null;
  }
}