// base44/shared/streamValidity.ts
// One authoritative backend rule for "is this a real per-second telemetry stream?".
// Used by every ingest path that may receive a provider summary instead of a recording
// (COROS FIT download, Garmin refetch, stored file re-parse) so a summary-shaped payload
// can never be stored as if it were measured data. Mirrors src/lib/streamValidity.js,
// which applies the same test to what is already in the database.

export const MAX_STREAM_SAMPLES = 3600;

// Enough points, a plausible time span for the session, and at least one physiological
// channel actually populated. A whole-activity CSV export (one row per session) or a
// handful of points reconstructed from a summary fails all three.
export function isUsableTelemetry(stream, durationSeconds) {
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

// The persisted stream shape (WorkoutSession.streams). Power is used for analysis at
// ingest time but is not part of the stored per-sample channels.
export function storageStream(stream) {
  return stream.map((p) => ({
    time: p.time, heart_rate: p.heart_rate, altitude: p.altitude, distance: p.distance, cadence: p.cadence, speed: p.speed,
  }));
}