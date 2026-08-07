// base44/shared/telemetryParser.ts
// Strict sanitization + deduplication for incoming workout telemetry, shared by the
// bulk-ingest and webhook pipelines so both enforce identical rules before any DB write.
// Plain module — no Deno.serve. Import from a function entry via:
//   import { TelemetryParser } from '../../shared/telemetryParser.ts';
// The frontend mirror lives at src/lib/telemetry/TelemetryParser.ts (re-exports this).

export const VALID_SPORTS = ['running', 'cycling', 'swimming', 'strength', 'triathlon', 'other'];
export const MIN_DURATION_S = 60;      // sessions shorter than 60s are bogus/empty
export const MAX_DURATION_S = 86400;   // 24h hard ceiling — anything over is a parse error
export const MAX_DURATION_MIN = 1440;

function clampDurationSeconds(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, MAX_DURATION_S);
}

function roundInt(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.round(n);
}

function roundDec(v, places) {
  const p = places || 2;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  const f = Math.pow(10, p);
  return Math.round(n * f) / f;
}

// Sanitize a single workout-session payload before DB insertion.
// - clamps elapsed_time_s (duration_seconds) to [0, 86400]
// - rounds integer metrics (avg_hr/max_hr) and fixes decimal metrics (distance/power/cadence/trimp/tss)
// - rejects unrecoverable payloads (missing/invalid date or impossible duration) by returning null
// so the caller can drop the row and report it instead of persisting garbage.
export function sanitizeSession(session) {
  if (!session || typeof session !== 'object') return null;

  const date = typeof session.date === 'string' ? session.date : null;
  if (!date || isNaN(Date.parse(date))) return null;

  const sport = VALID_SPORTS.includes(session.sport) ? session.sport : 'running';

  const durationSeconds = clampDurationSeconds(session.duration_seconds);
  let durationMinutes = Number(session.duration_minutes);
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    durationMinutes = durationSeconds / 60;
  }
  durationMinutes = Math.min(Math.max(durationMinutes, 0), MAX_DURATION_MIN);

  // Reject bogus/empty sessions (< 1 min or over 24h) at the source.
  if (durationMinutes < 1 || durationMinutes > MAX_DURATION_MIN) return null;

  const distanceKm = roundDec(session.distance_km, 2);
  if (distanceKm === null) return null;

  return {
    ...session,
    date,
    sport,
    duration_seconds: Math.max(0, Math.round(durationSeconds)),
    duration_minutes: roundDec(durationMinutes, 2),
    distance_km: distanceKm,
    avg_hr: roundInt(session.avg_hr) ?? undefined,
    max_hr: roundInt(session.max_hr) ?? undefined,
    avg_power: roundDec(session.avg_power, 1) ?? undefined,
    avg_cadence: roundDec(session.avg_cadence, 1) ?? undefined,
    session_trimp: roundDec(session.session_trimp, 2) ?? 0,
    session_tss: roundDec(session.session_tss, 2) ?? 0,
  };
}

// Dedup against a bucketed index of existing + staged sessions: { date: [sessions] }.
// A session is a duplicate when another session shares the same workout start date + sport
// and a near-identical duration/distance, preventing repeated-import inflation.
export function isDuplicateSession(byDate, date, sport, durationMinutes, distanceKm) {
  const bucket = (byDate && byDate[date]) || [];
  return bucket.some((s) =>
    s.sport === sport &&
    Math.abs((s.duration_minutes || 0) - (durationMinutes || 0)) < 1 &&
    Math.abs((s.distance_km || 0) - (distanceKm || 0)) < 0.1
  );
}

export const TelemetryParser = {
  sanitize: sanitizeSession,
  isDuplicate: isDuplicateSession,
  VALID_SPORTS,
  MAX_DURATION_S,
  MIN_DURATION_S,
};