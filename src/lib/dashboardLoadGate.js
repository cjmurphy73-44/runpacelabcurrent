// Fail closed until daily load can be reconciled to a verified single-unit series.
// A source string alone does not prove recording verification.
export function dashboardLoadGate(workouts) {
  if (!Array.isArray(workouts) || workouts.length === 0) return { ready: false, reason: "No recorded workouts" };
  for (const w of workouts) {
    const trimp = w?.session_trimp;
    const tss = w?.session_tss;
    if (trimp != null && tss != null) return { ready: false, reason: "Mixed load units" };
    if (trimp == null && tss == null) return { ready: false, reason: "Missing session load" };
    const value = trimp ?? tss;
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return { ready: false, reason: "Invalid session load" };
    if (w?.load_source !== "stream" || w?.stream_verified !== true) return { ready: false, reason: "Unverified recording provenance" };
    if (typeof w?.date !== "string" || !/^\d{4}-\d{2}-\d{2}/.test(w.date)) return { ready: false, reason: "Invalid workout date" };
  }
  const units = new Set(workouts.map(w => w.session_trimp != null ? "TRIMP" : "TSS"));
  if (units.size !== 1) return { ready: false, reason: "Incomparable load units" };
  return { ready: true, unit: [...units][0] };
}
