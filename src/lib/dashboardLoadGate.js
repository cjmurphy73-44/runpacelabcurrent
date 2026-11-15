// Contract grounded in WorkoutSession.jsonc and resolveSessionLoad.
// A zero-valued default for the unused load field is not a second load unit.
// This gate checks persisted backend provenance, not independently audited files.
export function dashboardLoadGate(workouts) {
  if (!Array.isArray(workouts) || workouts.length === 0) return { ready: false, reason: "No recorded workouts" };
  for (const w of workouts) {
    if (typeof w?.date !== "string" || !/^\d{4}-\d{2}-\d{2}/.test(w.date)) return { ready: false, reason: "Invalid workout date" };
    const trimp = w?.session_trimp;
    const tss = w?.session_tss;
    if (trimp != null && (typeof trimp !== "number" || !Number.isFinite(trimp) || trimp < 0)) return { ready: false, reason: "Invalid TRIMP" };
    if (tss != null && (typeof tss !== "number" || !Number.isFinite(tss) || tss < 0)) return { ready: false, reason: "Invalid TSS" };
    if (typeof trimp !== "number" || trimp <= 0 || (tss ?? 0) !== 0) return { ready: false, reason: "Missing or incomparable TRIMP" };
    if (w.load_source !== "stream" || typeof w.load_coverage_pct !== "number" ||
        !Number.isFinite(w.load_coverage_pct) || w.load_coverage_pct < 30 || w.load_coverage_pct > 100) {
      return { ready: false, reason: "Unverified load provenance" };
    }
  }
  return { ready: true, unit: "TRIMP" };
}
