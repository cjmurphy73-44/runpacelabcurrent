// Interpret the single-file ingest contract without treating HTTP success or
// an empty response as proof that an athlete workout has been persisted.
const UNCERTAIN = "Import outcome could not be verified. Check your workout log before retrying to avoid duplicate sessions.";

function isPositiveInteger(value) {
  return Number.isSafeInteger(value) && value > 0;
}

function confirmedId(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function singleFileImportOutcome(data, fileName = "") {
  const fit = typeof fileName === "string" && /\.fit$/i.test(fileName);
  const recovery = fit
    ? " Check your workout log before retrying. If the FIT file is damaged or unsupported, export a fresh original recording from your device; do not assume a partial recording was imported."
    : " Check your workout log before retrying.";

  if (typeof data?.error === "string" && data.error.trim()) {
    return { type: "error", confirmed: false, message: `Import not confirmed: ${data.error}.${recovery}` };
  }
  if (data?.success !== true) {
    return { type: "error", confirmed: false, message: UNCERTAIN };
  }

  if (data.attached === true && confirmedId(data.workout_session_id)) {
    return { type: "success", confirmed: true, message: "Recording attached to an existing workout. No additional workout was created." };
  }
  if (confirmedId(data.workout_session?.id)) {
    return { type: "success", confirmed: true, message: "Workout saved. Check workout details to confirm recording coverage." };
  }
  if (isPositiveInteger(data.imported_sessions_count)) {
    return {
      type: "success", confirmed: true,
      message: `${data.imported_sessions_count} workout(s) saved. Check workout details to confirm recording coverage.`,
    };
  }
  if (data.imported_sessions_count === 0 && isPositiveInteger(data.skipped_duplicates)) {
    return { type: "warning", confirmed: false, message: "Existing duplicate workout(s) skipped. No new workout was confirmed." };
  }
  return { type: "error", confirmed: false, message: UNCERTAIN };
}
