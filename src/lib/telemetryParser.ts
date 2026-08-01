// Unified Telemetry Parser
// Client-side parsing pipeline for workout files (.csv, .gpx, .tcx).
// .fit files are binary and remain server-parsed (see base44/functions/ingestWorkoutFile)
// — this module flags them as requiring server parsing rather than duplicating that logic.

export interface TelemetryPoint {
  time: number; // seconds elapsed from start
  heart_rate?: number;
  altitude?: number;
  distance?: number; // meters, cumulative
  cadence?: number;
  speed?: number; // meters/second
}

export interface ParsedTelemetry {
  sport: string;
  date: string; // ISO date (YYYY-MM-DD)
  duration_seconds: number;
  distance_km: number;
  avg_hr?: number;
  max_hr?: number;
  streams: TelemetryPoint[];
  requiresServerParsing?: boolean;
}

export type SupportedFileType = "csv" | "gpx" | "tcx" | "fit" | "unknown";

export function detectFileType(filename: string): SupportedFileType {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "csv") return "csv";
  if (ext === "gpx") return "gpx";
  if (ext === "tcx") return "tcx";
  if (ext === "fit") return "fit";
  return "unknown";
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function summarizeStreams(streams: TelemetryPoint[]): { avg_hr?: number; max_hr?: number } {
  const hrValues = streams.map((s) => s.heart_rate).filter((v): v is number => typeof v === "number" && v > 0);
  if (hrValues.length === 0) return {};
  const avg_hr = Math.round(hrValues.reduce((a, b) => a + b, 0) / hrValues.length);
  const max_hr = Math.round(Math.max(...hrValues));
  return { avg_hr, max_hr };
}

// --- CSV ---
// Expects a header row; recognizes common column names from wearable exports.
export function parseCSV(text: string): ParsedTelemetry {
  const lines = text.trim().split(/\r?\n/);
  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const rows = lines.slice(1).map((line) => line.split(","));

  const col = (name: string) => header.findIndex((h) => h.includes(name));
  const timeIdx = col("time") !== -1 ? col("time") : col("elapsed");
  const hrIdx = col("heart");
  const distIdx = col("distance");
  const altIdx = col("altitude") !== -1 ? col("altitude") : col("elevation");
  const cadIdx = col("cadence");
  const speedIdx = col("speed");

  // Supports both numeric (elapsed seconds / epoch) and ISO-8601 timestamp columns —
  // a plain Number() on an ISO string is NaN, which previously collapsed durations to ~row index.
  let firstTimestampMs: number | null = null;

  const streams: TelemetryPoint[] = rows
    .filter((r) => r.length >= header.length)
    .map((r, i) => {
      let time = i;
      if (timeIdx !== -1) {
        const raw = (r[timeIdx] || "").trim();
        const numeric = Number(raw);
        if (raw !== "" && !isNaN(numeric)) {
          time = numeric;
        } else {
          const parsedMs = Date.parse(raw);
          if (!isNaN(parsedMs)) {
            if (firstTimestampMs === null) firstTimestampMs = parsedMs;
            time = (parsedMs - firstTimestampMs) / 1000;
          }
        }
      }
      return {
        time,
        heart_rate: hrIdx !== -1 ? Number(r[hrIdx]) || undefined : undefined,
        distance: distIdx !== -1 ? Number(r[distIdx]) || undefined : undefined,
        altitude: altIdx !== -1 ? Number(r[altIdx]) || undefined : undefined,
        cadence: cadIdx !== -1 ? Number(r[cadIdx]) || undefined : undefined,
        speed: speedIdx !== -1 ? Number(r[speedIdx]) || undefined : undefined,
      };
    });

  const lastDistance = [...streams].reverse().find((s) => typeof s.distance === "number")?.distance || 0;
  const duration_seconds = streams.length > 0 ? streams[streams.length - 1].time : 0;

  return {
    sport: "running",
    date: firstTimestampMs !== null ? new Date(firstTimestampMs).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
    duration_seconds,
    distance_km: lastDistance / 1000,
    streams,
    ...summarizeStreams(streams),
  };
}

// --- GPX ---
export function parseGPX(text: string): ParsedTelemetry {
  const doc = new DOMParser().parseFromString(text, "application/xml");
  const trkpts = Array.from(doc.getElementsByTagName("trkpt"));

  let cumulativeDistance = 0;
  let prevLat: number | null = null;
  let prevLon: number | null = null;
  let startTime: number | null = null;

  const streams: TelemetryPoint[] = trkpts.map((pt) => {
    const lat = parseFloat(pt.getAttribute("lat") || "0");
    const lon = parseFloat(pt.getAttribute("lon") || "0");
    const ele = pt.getElementsByTagName("ele")[0]?.textContent;
    const timeEl = pt.getElementsByTagName("time")[0]?.textContent;
    const hrEl = pt.getElementsByTagName("gpxtpx:hr")[0]?.textContent || pt.getElementsByTagName("hr")[0]?.textContent;
    const cadEl = pt.getElementsByTagName("gpxtpx:cad")[0]?.textContent || pt.getElementsByTagName("cad")[0]?.textContent;

    const timestamp = timeEl ? new Date(timeEl).getTime() / 1000 : null;
    if (startTime === null && timestamp !== null) startTime = timestamp;

    if (prevLat !== null && prevLon !== null) {
      cumulativeDistance += haversineMeters(prevLat, prevLon, lat, lon);
    }
    prevLat = lat;
    prevLon = lon;

    return {
      time: timestamp !== null && startTime !== null ? timestamp - startTime : 0,
      altitude: ele ? Number(ele) : undefined,
      distance: cumulativeDistance,
      heart_rate: hrEl ? Number(hrEl) : undefined,
      cadence: cadEl ? Number(cadEl) : undefined,
    };
  });

  const firstTimeEl = trkpts[0]?.getElementsByTagName("time")[0]?.textContent;
  const duration_seconds = streams.length > 0 ? streams[streams.length - 1].time : 0;

  return {
    sport: "running",
    date: firstTimeEl ? new Date(firstTimeEl).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
    duration_seconds,
    distance_km: cumulativeDistance / 1000,
    streams,
    ...summarizeStreams(streams),
  };
}

// --- TCX ---
export function parseTCX(text: string): ParsedTelemetry {
  const doc = new DOMParser().parseFromString(text, "application/xml");
  const trackpoints = Array.from(doc.getElementsByTagName("Trackpoint"));

  let startTime: number | null = null;

  const streams: TelemetryPoint[] = trackpoints.map((tp) => {
    const timeEl = tp.getElementsByTagName("Time")[0]?.textContent;
    const distEl = tp.getElementsByTagName("DistanceMeters")[0]?.textContent;
    const altEl = tp.getElementsByTagName("AltitudeMeters")[0]?.textContent;
    const hrEl = tp.getElementsByTagName("HeartRateBpm")[0]?.getElementsByTagName("Value")[0]?.textContent;
    const cadEl = tp.getElementsByTagName("Cadence")[0]?.textContent;
    const speedEl = tp.getElementsByTagName("Speed")[0]?.textContent;

    const timestamp = timeEl ? new Date(timeEl).getTime() / 1000 : null;
    if (startTime === null && timestamp !== null) startTime = timestamp;

    return {
      time: timestamp !== null && startTime !== null ? timestamp - startTime : 0,
      distance: distEl ? Number(distEl) : undefined,
      altitude: altEl ? Number(altEl) : undefined,
      heart_rate: hrEl ? Number(hrEl) : undefined,
      cadence: cadEl ? Number(cadEl) : undefined,
      speed: speedEl ? Number(speedEl) : undefined,
    };
  });

  const firstTimeEl = trackpoints[0]?.getElementsByTagName("Time")[0]?.textContent;
  const lastDistance = [...streams].reverse().find((s) => typeof s.distance === "number")?.distance || 0;
  const duration_seconds = streams.length > 0 ? streams[streams.length - 1].time : 0;

  return {
    sport: "running",
    date: firstTimeEl ? new Date(firstTimeEl).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
    duration_seconds,
    distance_km: lastDistance / 1000,
    streams,
    ...summarizeStreams(streams),
  };
}

// --- Entry point ---
// Reads the file and routes to the correct parser. FIT files are flagged for
// server-side parsing (existing ingestWorkoutFile/bulkIngestWorkouts pipeline).
export async function parseTelemetryFile(file: File): Promise<ParsedTelemetry> {
  const type = detectFileType(file.name);

  if (type === "fit") {
    return {
      sport: "running",
      date: new Date().toISOString().split("T")[0],
      duration_seconds: 0,
      distance_km: 0,
      streams: [],
      requiresServerParsing: true,
    };
  }

  if (type === "unknown") {
    throw new Error(`Unsupported file type: ${file.name}`);
  }

  const text = await file.text();
  if (type === "csv") return parseCSV(text);
  if (type === "gpx") return parseGPX(text);
  return parseTCX(text);
}