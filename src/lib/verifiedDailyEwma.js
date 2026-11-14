// A standalone, conservative 42/7-day EWMA calculator.
// Input daily totals must already be reconciled to one load unit. Each calendar
// day, including explicit rest days, requires independent completeness evidence.
// This does not infer completion from missing workouts or dates.
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const round = n => Math.round(n * 1000) / 1000;

export function verifiedDailyEwma(days) {
  if (!Array.isArray(days) || days.length === 0) {
    return { ok: false, reason: "No verified daily history", points: [] };
  }
  const sorted = [...days].sort((a, b) => String(a?.date).localeCompare(String(b?.date)));
  let previousDay = null;
  let ctl = 0;
  let atl = 0;
  const points = [];
  for (const day of sorted) {
    const date = day?.date;
    if (typeof date !== "string" || !DATE.test(date) ||
        !Number.isFinite(Date.parse(date + "T00:00:00Z")) ||
        new Date(date + "T00:00:00Z").toISOString().slice(0, 10) !== date) {
      return { ok: false, reason: "Invalid calendar date", points: [] };
    }
    if (previousDay !== null) {
      const expected = new Date(previousDay + "T00:00:00Z");
      expected.setUTCDate(expected.getUTCDate() + 1);
      if (date !== expected.toISOString().slice(0, 10)) {
        return { ok: false, reason: "Missing or repeated calendar day", points: [] };
      }
    }
    if (day.complete !== true || day.unit !== "TRIMP" ||
        typeof day.trimp !== "number" || !Number.isFinite(day.trimp) || day.trimp < 0) {
      return { ok: false, reason: "Unverified or incomparable daily load", points: [] };
    }
    if (points.length === 0) {
      ctl = day.trimp;
      atl = day.trimp;
    } else {
      ctl += (1 - Math.exp(-1 / 42)) * (day.trimp - ctl);
      atl += (1 - Math.exp(-1 / 7)) * (day.trimp - atl);
    }
    points.push({ date, ctl: round(ctl), atl: round(atl), tsb: round(ctl - atl), unit: "TRIMP" });
    previousDay = date;
  }
  return { ok: true, points, unit: "TRIMP", initialization: "first-day-load", completeDays: points.length };
}
