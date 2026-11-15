// Pure evidence gate for daily load completeness.
// This function does NOT fetch provider records or certify their authenticity.
// Callers must supply a trusted, server-side reconciliation result, never a
// browser/user-provided boolean or a count inferred from visible workouts.
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const validDate = date => typeof date === "string" && DATE.test(date) &&
  Number.isFinite(Date.parse(date + "T00:00:00Z")) &&
  new Date(date + "T00:00:00Z").toISOString().slice(0, 10) === date;

export function reconcileCompleteDailyLoad(dailyLoads, evidence) {
  const fail = reason => ({ ok: false, reason, days: [] });
  if (!Array.isArray(dailyLoads) || dailyLoads.length === 0) return fail("No reconciled daily loads");
  if (!Array.isArray(evidence) || evidence.length !== dailyLoads.length) {
    return fail("Missing daily reconciliation evidence");
  }
  const byDate = new Map();
  for (const item of evidence) {
    if (!validDate(item?.date) || byDate.has(item.date)) return fail("Invalid or duplicate evidence date");
    // Explicitly completed, provider-scoped reconciliation; no pending/failed
    // pages, downloads or writes, and no unverified activity counts.
    if (item.source !== "server_reconciliation" ||
        item.status !== "complete" || item.pending !== 0 || item.failed !== 0 ||
        !Number.isSafeInteger(item.expectedActivities) || item.expectedActivities < 0 ||
        !Number.isSafeInteger(item.persistedActivities) ||
        item.persistedActivities !== item.expectedActivities) {
      return fail("Provider reconciliation incomplete");
    }
    if (item.expectedActivities === 0 && item.restDayConfirmed !== true) {
      return fail("Empty day is not confirmed rest");
    }
    byDate.set(item.date, item);
  }
  const dates = new Set();
  const days = [];
  for (const day of dailyLoads) {
    if (!validDate(day?.date) || dates.has(day.date)) return fail("Invalid or duplicate load date");
    dates.add(day.date);
    const proof = byDate.get(day.date);
    if (!proof) return fail("Daily evidence date mismatch");
    if (day.unit !== "TRIMP" || typeof day.trimp !== "number" ||
        !Number.isFinite(day.trimp) || day.trimp < 0) return fail("Invalid daily TRIMP");
    if (proof.expectedActivities === 0 && day.trimp !== 0) return fail("Nonzero load on confirmed rest day");
    if (proof.expectedActivities > 0 && day.trimp === 0) return fail("Missing load on active day");
    days.push({ date: day.date, trimp: day.trimp, unit: "TRIMP", complete: true });
  }
  days.sort((a, b) => a.date.localeCompare(b.date));
  for (let i = 1; i < days.length; i++) {
    const next = new Date(days[i - 1].date + "T00:00:00Z");
    next.setUTCDate(next.getUTCDate() + 1);
    if (days[i].date !== next.toISOString().slice(0, 10)) return fail("Calendar history has gaps");
  }
  return { ok: true, days, evidence: "server-reconciled-input" };
}
