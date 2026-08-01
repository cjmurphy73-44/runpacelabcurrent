// Lightweight, browser-native FIT "session" message decoder.
// Extracts only session-level summary fields (no per-second records), so it
// can compile hundreds of .fit files locally in the browser quickly.

const GARMIN_EPOCH_OFFSET_SEC = 631065600; // seconds between Unix epoch and FIT epoch (1989-12-31)
const MAX_DURATION_SECONDS = 24 * 60 * 60; // reject sessions longer than 24h — sign of corrupted/misread timestamp data

const SPORT_MAP = {
  0: "other",
  1: "running",
  2: "cycling",
  5: "swimming",
  10: "strength",
  18: "triathlon",
};

// Best-effort fallback when the top-level `sport` field is missing/generic (0) —
// uses `sub_sport` to still recognize common cycling/running/swimming variants.
const SUB_SPORT_MAP = {
  1: "running", 2: "running", 3: "running", 4: "running", // treadmill, street, trail, track
  6: "cycling", 7: "cycling", 8: "cycling", 9: "cycling", 10: "cycling", 11: "cycling", 12: "cycling", 13: "cycling", // road, mountain, downhill, recumbent, cyclocross, hand_cycling, track_cycling, indoor_cycling
  17: "swimming", 18: "swimming", // lap_swimming, open_water
};

function mapFitSport(sportCode, subSportCode) {
  if (sportCode !== undefined && sportCode !== null && SPORT_MAP[sportCode] && SPORT_MAP[sportCode] !== "other") {
    return SPORT_MAP[sportCode];
  }
  if (subSportCode !== undefined && subSportCode !== null && SUB_SPORT_MAP[subSportCode]) {
    return SUB_SPORT_MAP[subSportCode];
  }
  return SPORT_MAP[sportCode] ?? "other";
}

function baseTypeSize(baseType) {
  const t = baseType & 0x1f;
  if (t === 3 || t === 4 || t === 11) return 2;
  if (t === 5 || t === 6 || t === 8 || t === 12) return 4;
  if (t === 9 || t === 14 || t === 15 || t === 16) return 8;
  return 1;
}

// Decodes only the FIT "session" message (global mesg num 18), which holds
// per-activity summary fields: start time, total distance/time, avg/max HR, sport.
export function parseFitSummary(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const headerSize = view.getUint8(0);
  let offset = headerSize;
  const localDefs = {};
  let session = null;

  while (offset < bytes.byteLength - 2) {
    const recordHeader = view.getUint8(offset);
    offset += 1;
    const isDefinition = (recordHeader & 0x40) !== 0;
    const localMesgType = (recordHeader & 0x80) !== 0 ? (recordHeader >> 5) & 0x3 : recordHeader & 0xf;

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
        const t = f.baseType & 0x1f;
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
        if (def.globalMesgNum === 18 && value !== null) {
          if (f.fieldNum === 253 && value !== 0xffffffff) rec.timestamp = value;
          if (f.fieldNum === 7 && value !== 0xffffffff) rec.total_elapsed_time = value / 1000;
          if (f.fieldNum === 9 && value !== 0xffffffff) rec.total_distance_meters = value / 100;
          if (f.fieldNum === 16 && value !== 0xff) rec.avg_heart_rate = value;
          if (f.fieldNum === 17 && value !== 0xff) rec.max_heart_rate = value;
          if (f.fieldNum === 5 && value !== 0xff) rec.sport = value;
          if (f.fieldNum === 6 && value !== 0xff) rec.sub_sport = value;
        }
        offset += f.size;
      }
      if (def.globalMesgNum === 18 && Object.keys(rec).length > 0) {
        session = { ...(session || {}), ...rec };
      }
    }
  }

  if (!session || !session.timestamp) {
    throw new Error("No valid session message found in FIT file");
  }

  const elapsedSeconds = session.total_elapsed_time || 0;
  if (elapsedSeconds > MAX_DURATION_SECONDS) {
    throw new Error(`Duration exceeds 24 hours (${Math.round(elapsedSeconds / 3600)}h) — likely corrupted timestamp data`);
  }

  return {
    timestamp: new Date((session.timestamp + GARMIN_EPOCH_OFFSET_SEC) * 1000).toISOString(),
    total_distance_meters: session.total_distance_meters || 0,
    total_elapsed_time: elapsedSeconds,
    avg_heart_rate: session.avg_heart_rate || null,
    max_heart_rate: session.max_heart_rate || null,
    sport: mapFitSport(session.sport, session.sub_sport),
  };
}