import { parseTelemetryFile, detectFileType } from "@/lib/telemetryParser";
import { calculateTrimp } from "@/lib/physiologyEngine";

// Background processing queue for files that require server-side parsing
// (e.g. .fit binaries, or files missing the HR data needed for client-side TRIMP).
export const processWorkoutQueue = async (fileData) => {
  console.log("Queueing file for processing...", fileData);
  // This will link to base44/functions/ingestWorkoutFile or bulkIngestWorkouts
};

// Parses an uploaded file via the unified telemetry parser, computes TRIMP
// client-side when possible, and returns a normalized workout object ready
// to append to the athlete's workout state.
export async function processUploadedFile(file, athleteProfile = {}) {
  const source_format = detectFileType(file.name);
  const parsed = await parseTelemetryFile(file);

  const workout = {
    sport: parsed.sport,
    date: parsed.date,
    duration_minutes: parsed.duration_seconds / 60,
    duration_seconds: parsed.duration_seconds,
    distance_km: parsed.distance_km,
    avg_hr: parsed.avg_hr,
    max_hr: parsed.max_hr,
    streams: parsed.streams,
    source_format,
    session_trimp: 0,
  };

  const { max_heart_rate, resting_hr, sex } = athleteProfile;

  // Fallback: server parsing required (.fit) or HR data missing for TRIMP calc
  if (parsed.requiresServerParsing || !parsed.avg_hr || !max_heart_rate || !resting_hr) {
    const queuePayload = {
      fileName: file.name,
      source_format,
      reason: parsed.requiresServerParsing ? "requires_server_parsing" : "missing_hr_data",
    };
    await processWorkoutQueue(queuePayload);
    return { ...workout, requires_server_parsing: true, queue_payload: queuePayload };
  }

  const gender = sex === "female" ? "F" : "M";
  workout.session_trimp = calculateTrimp(
    parsed.duration_seconds,
    parsed.avg_hr,
    max_heart_rate,
    resting_hr,
    gender
  );

  return { ...workout, requires_server_parsing: false };
}