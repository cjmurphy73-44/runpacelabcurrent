import { isWorkoutSport } from './workoutSports.ts';

const SECONDS_PER_DAY = 86400;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function roundMetric(value, places) {
  if (value == null || value === '' || typeof value === 'boolean') return undefined;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return undefined;
  const scale = 10 ** places;
  const rounded = Math.round(number * scale) / scale;
  return Number.isFinite(rounded) ? rounded : undefined;
}

function sanitizeSession(session) {
  if (!session || !DATE_ONLY.test(session.date) || !isWorkoutSport(session.sport)) return null;
  const day = new Date(session.date + 'T00:00:00Z');
  if (!Number.isFinite(day.getTime()) || day.toISOString().slice(0, 10) !== session.date ||
      day.getTime() > Date.now() + SECONDS_PER_DAY * 1000) return null;

  const seconds = Number(session.duration_seconds ?? Number(session.duration_minutes) * 60);
  const distance = roundMetric(session.distance_km, 2);
  if (!Number.isFinite(seconds) || seconds < 60 || seconds > SECONDS_PER_DAY || distance === undefined) return null;

  const durationSeconds = Math.round(seconds);
  return {
    ...session,
    duration_seconds: durationSeconds,
    duration_minutes: roundMetric(durationSeconds / 60, 2),
    distance_km: distance,
    avg_hr: roundMetric(session.avg_hr, 0),
    max_hr: roundMetric(session.max_hr, 0),
    avg_power: roundMetric(session.avg_power, 1),
    avg_cadence: roundMetric(session.avg_cadence, 1),
    session_trimp: roundMetric(session.session_trimp, 2) ?? 0,
    session_tss: roundMetric(session.session_tss, 2) ?? 0,
  };
}

function isDuplicateSession(byDate, date, sport, durationMinutes, distanceKm) {
  const sameDay = byDate[date];
  return Array.isArray(sameDay) && sameDay.some(session => session.sport === sport &&
    Math.abs(Number(session.duration_minutes) - durationMinutes) < 1 &&
    Math.abs(Number(session.distance_km ?? 0) - distanceKm) < 0.1);
}

// The bulk import uses the same checks for file rows and pre-parsed summaries.
export const TelemetryParser = { sanitize: sanitizeSession, isDuplicate: isDuplicateSession };
