// Date-only workout imports must not accept invalid calendar dates or silently
// roll them into another month. Do not infer the athlete's timezone on server.
const MAX_AHEAD_MS = 14 * 60 * 60 * 1000; // maximum civil-date offset ahead of UTC

export function validateWorkoutImportDate(value, now = Date.now()) {
  if (typeof value !== "string" || !/^\\d{4}-\\d{2}-\\d{2}$/.test(value)) {
    return { ok: false, error: "date must be a valid YYYY-MM-DD calendar date" };
  }
  const [year, month, day] = value.split("-").map(Number);
  const timestamp = Date.UTC(year, month - 1, day);
  const parsed = new Date(timestamp);
  if (year < 1970 || year > 9999 ||
      parsed.getUTCFullYear() !== year ||
      parsed.getUTCMonth() + 1 !== month ||
      parsed.getUTCDate() !== day) {
    return { ok: false, error: "date must be a valid YYYY-MM-DD calendar date" };
  }
  if (!Number.isFinite(now) || timestamp > now + MAX_AHEAD_MS) {
    return { ok: false, error: "date cannot be in the future" };
  }
  return { ok: true };
}
