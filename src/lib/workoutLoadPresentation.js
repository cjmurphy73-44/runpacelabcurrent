// Read-only workout load presentation. Backend provenance is not proof of
// verified telemetry; never silently coerce TSS into TRIMP or mix both.
export function workoutLoadPresentation(workout) {
  const trimp = workout?.session_trimp;
  const tss = workout?.session_tss;
  const hasTrimp = trimp !== undefined && trimp !== null;
  const hasTss = tss !== undefined && tss !== null;
  const valid = (value) => typeof value === "number" && Number.isFinite(value) && value > 0;

  if (hasTrimp && hasTss) {
    return { label: "Mixed load units", amount: "Load unavailable", measured: false };
  }
  if (!hasTrimp && !hasTss) {
    return { label: "No load recorded", amount: "Load unavailable", measured: false };
  }
  const value = hasTrimp ? trimp : tss;
  if (!valid(value)) {
    return { label: "Invalid load", amount: "Load unavailable", measured: false };
  }

  const label = workout?.load_source === "summary"
    ? "Estimated from summary"
    : workout?.load_source === "stream"
      ? "Recording-derived, verification pending"
      : "Source unverified";
  return {
    label,
    amount: `${Math.round(value)} ${hasTrimp ? "TRIMP" : "TSS"}`,
    measured: false,
  };
}
