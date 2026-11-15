// Distinguish a verified empty day from missing data. Keep every scheduled
// session for a day, not just the first workout in a multi-session plan.
export function sessionsOnDay(sessions, date) {
  if (!Array.isArray(sessions) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];
  return sessions.filter((s) => s && s.date === date);
}
export function calendarDayLabel(sessions, date, loaded) {
  if (!loaded) return "Schedule unavailable";
  return sessionsOnDay(sessions, date).length ? "Scheduled sessions" : "No session scheduled";
}
