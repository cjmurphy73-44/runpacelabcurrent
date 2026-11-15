// A date can contain multiple independent prescribed workouts.
// Preserve the backend order for equally timed sessions, and never turn a
// missing or failed response into an asserted rest day.
export function sessionsForCalendarDay(sessions, date) {
  if (!Array.isArray(sessions) || typeof date !== "string") return [];
  return sessions
    .filter((session) => session && session.date === date)
    .sort((a, b) => {
      const timeA = typeof a.start_time === "string" ? a.start_time : "";
      const timeB = typeof b.start_time === "string" ? b.start_time : "";
      return timeA && timeB ? timeA.localeCompare(timeB) : 0;
    });
}

export function calendarDayState({ sessions, date, loading = false, failed = false }) {
  if (failed || !Array.isArray(sessions)) return { kind: "unavailable", sessions: [] };
  if (loading) return { kind: "loading", sessions: [] };
  const matches = sessionsForCalendarDay(sessions, date);
  return matches.length > 0
    ? { kind: "sessions", sessions: matches }
    : { kind: "rest", sessions: [] };
}
