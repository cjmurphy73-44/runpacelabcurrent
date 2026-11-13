/** Compare daily EWMA state only with the immediately preceding date. */
export function previousCalendarDate(isoDate) {
  if (typeof isoDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null;
  const ms = Date.parse(isoDate + "T00:00:00Z");
  if (!Number.isFinite(ms) || new Date(ms).toISOString().slice(0, 10) !== isoDate) return null;
  return new Date(ms - 86400000).toISOString().slice(0, 10);
}
export function findPreviousDayMetrics(rows, isoDate) {
  const prevDate = previousCalendarDate(isoDate);
  return prevDate && Array.isArray(rows) ? rows.find(row => row.date === prevDate) || null : null;
}
