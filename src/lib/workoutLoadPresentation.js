// Presentation only: provenance is set by deterministic backend ingest, not inferred
// from a positive TRIMP number or guessed from the provider name.
export function workoutLoadPresentation(workout) {
  const source = workout?.load_source;
  const load = Number(workout?.session_trimp);
  const validLoad = workout?.session_trimp != null && Number.isFinite(load) && load > 0;
  const stress = Number(workout?.session_tss);
  const validStress = Number.isFinite(stress) && stress > 0;
  const label = source === "stream"
    ? "Measured recording"
    : source === "summary"
      ? "Estimated from summary"
      : !validLoad && validStress ? "Training stress estimate" : "Source unverified";
  return {
    label,
    amount: validLoad ? `${Math.round(load)} TRIMP` : validStress ? `${Math.round(stress)} TSS` : "Load unavailable",
    measured: source === "stream",
  };
}
