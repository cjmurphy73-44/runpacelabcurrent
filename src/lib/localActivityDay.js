/**
 * Athlete-local calendar dates for Home presentation.
 * WorkoutSession and DailyMetrics often contain YYYY-MM-DD without timezone.
 * Do not interpret those date-only values as UTC instants: near midnight this
 * incorrectly hides today's session in positive timezones.
 *
 * Timestamped input is mapped to the browser's local calendar date. This is
 * presentation only, not a source timestamp or a physiological computation.
 */
const DAY_MS = 86400000;

export function localDayIndex(value) {
  if (typeof value !== 'string') return null;
  let date;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match) {
    const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
    date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 ||
        date.getDate() !== day) return null;
  } else {
    if (!/^\d{4}-\d{2}-\d{2}T/.test(value)) return null;
    date = new Date(value);
    if (!Number.isFinite(date.getTime())) return null;
  }
  return Math.round(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS);
}

export function localCalendarAge(value, now = Date.now()) {
  if (typeof now !== 'number' || !Number.isFinite(now)) return null;
  const eventDay = localDayIndex(value);
  if (eventDay === null) return null;
  const today = new Date(now);
  const todayDay = Math.round(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) / DAY_MS);
  return eventDay <= todayDay ? todayDay - eventDay : null;
}
