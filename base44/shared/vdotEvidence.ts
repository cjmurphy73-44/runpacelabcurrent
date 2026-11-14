// Fail-closed eligibility for automatic Daniels VDOT estimates.
// An ordinary training run is not a maximal race performance.
export function validVdotInputs(timeSeconds, distanceMeters) {
  return typeof timeSeconds === 'number' && Number.isFinite(timeSeconds) &&
    typeof distanceMeters === 'number' && Number.isFinite(distanceMeters) &&
    timeSeconds >= 180 && distanceMeters >= 1200;
}
export function eligibleRacePerformance(session, now = Date.now()) {
  if (!session || typeof session.sport !== 'string' || !session.sport.toLowerCase().startsWith('run')) return false;
  if (session.is_race !== true && session.is_race !== 'true' && session.activity_type !== 'race') return false;
  const timestamp = typeof session.date === 'string' ? Date.parse(session.date) : NaN;
  if (!Number.isFinite(timestamp) || timestamp > now || now - timestamp > 180 * 86400000) return false;
  const seconds = session.duration_seconds ?? (session.duration_minutes == null ? null : session.duration_minutes * 60);
  const metres = session.distance_km == null ? null : session.distance_km * 1000;
  return validVdotInputs(seconds, metres);
}
export function usableStoredVdot(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}
