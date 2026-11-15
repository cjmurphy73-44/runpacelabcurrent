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
  let previous = -Infinity;
  for (const point of stream) {
    const time = point?.time;
    if (typeof time !== 'number') return false;
    if (!Number.isFinite(time) || time <= previous) return false;
    previous = time;
  }
  const span = stream[stream.length - 1].time - stream[0].time;
  if (span < 60 || span / (stream.length - 1) > 5) return false;
  const duration = Number(durationSeconds) || 0;
  if (duration > 0 && (span < duration * 0.6 || span > duration * 1.5 + 300)) return false;
  const withHr = stream.filter((p) => typeof p.heart_rate === 'number' && Number.isFinite(p.heart_rate) && p.heart_rate > 0).length;
  const withPower = stream.filter((p) => typeof p.power === 'number' && Number.isFinite(p.power) && p.power > 0).length;
  return withHr >= stream.length * 0.5 || withPower >= stream.length * 0.5;
}

// The persisted stream shape (WorkoutSession.streams). Preserve directly measured
// power samples, including true zero-watt coasting, without inventing data where
// the FIT/TCX recording provides no power channel.
export function storageStream(stream) {
  return stream.map((p) => ({
    time: p.time, heart_rate: p.heart_rate, altitude: p.altitude, distance: p.distance, cadence: p.cadence, speed: p.speed,
    power: typeof p.power === 'number' && Number.isFinite(p.power) && p.power >= 0 && p.power <= 2500 ? p.power : null,
  }));
}