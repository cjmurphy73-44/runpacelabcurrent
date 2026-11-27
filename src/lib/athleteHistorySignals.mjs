// Deterministic, read-only athlete context from verified saved workout history.
// Never infer readiness, health, menstrual phase or training clearance here.
const DAY_MS = 86_400_000;
function validDay(day) {
  if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const value = Date.parse(day + 'T00:00:00Z');
  return Number.isFinite(value) && new Date(value).toISOString().slice(0, 10) === day ? value : null;
}
export function athleteHistorySignals(rows = [], today = new Date().toISOString().slice(0, 10)) {
  const now = validDay(today);
  if (now === null) return { status: 'unavailable', reason: 'invalid_date' };
  if (!Array.isArray(rows)) return { status: 'unavailable', reason: 'invalid_history' };
  const byId = new Map();
  for (const row of rows) {
    const time = validDay(row?.date);
    if (time === null || time > now || time < now - 28 * DAY_MS || !row?.id) continue;
    const duration = Number(row.duration_minutes);
    if (!Number.isFinite(duration) || duration < 0) continue;
    byId.set(String(row.id), { ...row, time, duration });
  }
  const sessions = [...byId.values()];
  const current = sessions.filter(r => r.time > now - 7 * DAY_MS);
  const previous = sessions.filter(r => r.time <= now - 7 * DAY_MS && r.time > now - 14 * DAY_MS);
  const recentMinutes = current.reduce((sum, r) => sum + r.duration, 0);
  const previousMinutes = previous.reduce((sum, r) => sum + r.duration, 0);
  const measured = current.filter(r => r.load_source === 'stream').length;
  const estimated = current.filter(r => r.load_source === 'summary').length;
  const unknown = current.length - measured - estimated;
  const status = sessions.length ? 'available' : 'no_recent_history';
  return {
    status, currentSessions: current.length, previousSessions: previous.length,
    recentMinutes: Math.round(recentMinutes), previousMinutes: Math.round(previousMinutes),
    measured, estimated, unknown, distinctSports: [...new Set(current.map(r => r.sport).filter(Boolean))],
    comparison: previous.length && current.length
      ? (recentMinutes > previousMinutes ? 'more_time' : recentMinutes < previousMinutes ? 'less_time' : 'similar_time')
      : 'insufficient_history',
    explanation: 'Compares saved workout duration, not fitness, readiness or medical health. Stream and summary loads are reported separately.',
  };
}
