// Pure daily load reconciliation for persisted WorkoutSession records.
// No calendar gaps are imputed as rest days and no EWMA is computed here.
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function comparableDailyTrimp(sessions) {
  if (!Array.isArray(sessions) || sessions.length === 0) {
    return { ok: false, reason: "No sessions", days: [] };
  }
  const byDate = new Map();
  for (const session of sessions) {
    const date = session?.date;
    if (typeof date !== "string" || !DATE.test(date) ||
        !Number.isFinite(Date.parse(date + "T00:00:00Z")) ||
        new Date(date + "T00:00:00Z").toISOString().slice(0, 10) !== date) {
      return { ok: false, reason: "Invalid session date", days: [] };
    }
    const trimp = session.session_trimp;
    const tss = session.session_tss;
    if (typeof trimp !== "number" || !Number.isFinite(trimp) || trimp <= 0 ||
        (tss != null && (typeof tss !== "number" || !Number.isFinite(tss) || tss !== 0))) {
      return { ok: false, reason: "Missing or incomparable TRIMP", days: [] };
    }
    if (session.load_source !== "stream" ||
        typeof session.load_coverage_pct !== "number" ||
        !Number.isFinite(session.load_coverage_pct) ||
        session.load_coverage_pct < 30 || session.load_coverage_pct > 100) {
      return { ok: false, reason: "Unverified load provenance", days: [] };
    }
    byDate.set(date, (byDate.get(date) || 0) + trimp);
  }
  const days = [...byDate].sort(([a], [b]) => a.localeCompare(b))
    .map(([date, trimp]) => ({ date, trimp: Math.round(trimp * 100) / 100, unit: "TRIMP" }));
  return { ok: true, days, unit: "TRIMP", gapPolicy: "unknown" };
}
