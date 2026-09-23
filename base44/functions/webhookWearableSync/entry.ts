import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { runPostWorkoutEvaluation } from '../../shared/postWorkoutAI.ts';

function calcTrimp(durationMin, avgHr, restHr, maxHr, sex) {
  if (!durationMin || !avgHr || !maxHr || maxHr <= restHr) return 0;
  const hrr = Math.max(0, Math.min(1, (avgHr - restHr) / (maxHr - restHr)));
  const isFemale = sex === 'female';
  const a = isFemale ? 0.86 : 0.64;
  const b = isFemale ? 1.67 : 1.92;
  return Math.round(durationMin * hrr * a * Math.exp(b * hrr) * 100) / 100;
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

  let hrSum = 0, hrCount = 0, hrMax = 0;
  let powerSum = 0, powerCount = 0;
  let cadenceSum = 0, cadenceCount = 0;
  let maxDistance = 0;
  const timestamps = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (hrIdx !== -1) {
      const v = parseFloat(cols[hrIdx]);
      if (!isNaN(v)) { hrSum += v; hrCount++; hrMax = Math.max(hrMax, v); }
    }
    if (powerIdx !== -1) {
      const v = parseFloat(cols[powerIdx]);
      if (!isNaN(v)) { powerSum += v; powerCount++; }
    }
    if (cadenceIdx !== -1) {
      const v = parseFloat(cols[cadenceIdx]);
      if (!isNaN(v)) { cadenceSum += v; cadenceCount++; }
    }
    if (distIdx !== -1) {
      const v = parseFloat(cols[distIdx]);
      if (!isNaN(v)) maxDistance = Math.max(maxDistance, v);
    }
    if (timeIdx !== -1) {
      const raw = cols[timeIdx];
      const t = Date.parse(raw);
      if (!isNaN(t)) timestamps.push(t);
      else {
        const n = parseFloat(raw);
        if (!isNaN(n)) timestamps.push(n * 1000);
      }
    }
  }

  let durationMinutes = 0;
  if (timestamps.length >= 2) {
    durationMinutes = (Math.max(...timestamps) - Math.min(...timestamps)) / 1000 / 60;
  }

  let distanceKm = maxDistance;
  if (distanceKm > 1000) distanceKm = distanceKm / 1000;

  return {
    avg_hr: hrCount ? Math.round(hrSum / hrCount) : null,
    max_hr: hrMax || null,
    avg_power: powerCount ? Math.round(powerSum / powerCount) : null,
    avg_cadence: cadenceCount ? Math.round(cadenceSum / cadenceCount) : null,
    distance_km: distanceKm ? Math.round(distanceKm * 100) / 100 : null,
    duration_minutes: durationMinutes ? Math.round(durationMinutes * 100) / 100 : null,
  };
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
        }
        offset += f.size;
      }
      if (def.globalMesgNum === 20 && Object.keys(rec).length > 0) records.push(rec);
    }
  }
  return records;
}

function parseFit(bytes) {
  const records = decodeFitRecords(bytes);
  if (!records || records.length === 0) return null;
  let hrSum = 0, hrCount = 0, hrMax = 0;
  let powerSum = 0, powerCount = 0;
  let cadenceSum = 0, cadenceCount = 0;
  let maxDistance = 0;
  const timestamps = [];
  for (const r of records) {
    if (typeof r.heart_rate === 'number') { hrSum += r.heart_rate; hrCount++; hrMax = Math.max(hrMax, r.heart_rate); }
    if (typeof r.power === 'number') { powerSum += r.power; powerCount++; }
    if (typeof r.cadence === 'number') { cadenceSum += r.cadence; cadenceCount++; }
    if (typeof r.distance === 'number') maxDistance = Math.max(maxDistance, r.distance);
    if (typeof r.timestamp === 'number') timestamps.push(r.timestamp);
  }
  let durationMinutes = 0;
  if (timestamps.length >= 2) durationMinutes = (Math.max(...timestamps) - Math.min(...timestamps)) / 60;
  return {
    avg_hr: hrCount ? Math.round(hrSum / hrCount) : null,
    max_hr: hrMax || null,
    avg_power: powerCount ? Math.round(powerSum / powerCount) : null,
    avg_cadence: cadenceCount ? Math.round(cadenceSum / cadenceCount) : null,
    distance_km: maxDistance ? Math.round((maxDistance / 1000) * 100) / 100 : null,
    duration_minutes: durationMinutes ? Math.round(durationMinutes * 100) / 100 : null,
  };
}

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { secret, athlete_id, date, sport, file_name, file_text, file_base64 } = body;

    if (secret !== Deno.env.get('WEBHOOK_SYNC_SECRET')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!athlete_id || !file_name || !date) {
      return Response.json({ error: 'athlete_id, file_name and date are required' }, { status: 400 });
    }
    if (new Date(date) > new Date()) {
      return Response.json({ error: 'date cannot be in the future' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    const lowerName = file_name.toLowerCase();
    let parsed = null;
    let sourceFormat = 'csv';
    if (lowerName.endsWith('.fit')) {
      sourceFormat = 'fit';
      if (!file_base64) return Response.json({ error: 'file_base64 is required for .fit files' }, { status: 400 });
      const binary = Uint8Array.from(atob(file_base64), (c) => c.charCodeAt(0));
      parsed = parseFit(binary);
    } else if (lowerName.endsWith('.csv')) {
      sourceFormat = 'csv';
      if (!file_text) return Response.json({ error: 'file_text is required for .csv files' }, { status: 400 });
      parsed = parseCsv(file_text);
    } else {
      return Response.json({ error: 'Unsupported file type, only .fit and .csv are supported' }, { status: 400 });
    }

    if (!parsed) return Response.json({ error: 'Could not parse any telemetry from file' }, { status: 400 });

    const durationMinutes = parsed.duration_minutes || 0;
    const distanceKm = parsed.distance_km || 0;
    if (durationMinutes < 1 || (distanceKm <= 0 && durationMinutes <= 0)) {
      return Response.json({ error: 'File discarded: invalid record (zero distance/duration or under 60 seconds)' }, { status: 400 });
    }

    const athlete = await base44.asServiceRole.entities.AthleteProfile.get(athlete_id);
    if (!athlete) return Response.json({ error: 'Athlete profile not found' }, { status: 404 });

    const sessionSport = sport || 'running';

    // Dedup safeguard: reject a session if a matching one already exists for this date/sport/duration/distance
    // (mirrors the check in ingestWorkoutFile/bulkIngestWorkouts, so repeated webhook deliveries or the same
    // workout arriving from multiple device sources doesn't inflate training load).
    const existingSessions = await base44.asServiceRole.entities.WorkoutSession.filter({ athlete_id, date });
    const isDuplicate = existingSessions.some((s) =>
      s.sport === sessionSport &&
      Math.abs((s.duration_minutes || 0) - durationMinutes) < 1 &&
      Math.abs((s.distance_km || 0) - distanceKm) < 0.1
    );
    if (isDuplicate) {
      return Response.json({ error: 'A matching workout already exists for this date, sport, duration and distance', skipped: true }, { status: 409 });
    }

    const restHr = 60;
    const maxHr = athlete.max_heart_rate || parsed.max_hr || 190;
    const sessionTrimp = calcTrimp(durationMinutes, parsed.avg_hr, restHr, maxHr, athlete.sex);

    const session = await base44.asServiceRole.entities.WorkoutSession.create({
      athlete_id,
      created_by_id: athlete.created_by_id,
      date,
      sport: sessionSport,
      duration_minutes: durationMinutes,
      distance_km: distanceKm,
      avg_hr: parsed.avg_hr || undefined,
      max_hr: parsed.max_hr || undefined,
      avg_power: parsed.avg_power || undefined,
      avg_cadence: parsed.avg_cadence || undefined,
      source_format: sourceFormat,
      session_trimp: sessionTrimp,
    });

    await base44.asServiceRole.functions.invoke('calculateDailyTRIMP', { athlete_id, date });
    await runPostWorkoutEvaluation(base44, session.id, athlete_id);

    return Response.json({ success: true, workout_session: session });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});