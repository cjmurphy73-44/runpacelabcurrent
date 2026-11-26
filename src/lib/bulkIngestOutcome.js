// Interpret one bulk-ingest response without confusing partially saved sessions
// with a complete failure or duplicate skips with unsuccessful writes.
export function summarizeBulkIngestResponse(data) {
  const created = Math.max(0, Number(data?.created_count) || 0);
  const duplicates = Math.max(0, Number(data?.duplicate_count) || 0);
  const errors = Array.isArray(data?.errors) ? data.errors : [];
  const failures = errors.filter((row) => !/^Skipped duplicate workout/.test(row?.error || ""));
  if ((!Number.isInteger(data?.created_count) || data.created_count < 0) && data?.success !== false) {
    failures.push({ file_name: "Batch", error: "Import could not be confirmed. Check Workouts before retrying." });
  } else if (data?.success === false && failures.length === 0 && errors.length === 0) {
    failures.push({ file_name: "Batch", error: data?.error || "Batch failed — verify saved workouts before retrying." });
  }
  const workoutId = created === 1 && typeof data?.workout_session_id === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(data.workout_session_id)
    ? data.workout_session_id : null;
  return { created, duplicates, failures, ...(workoutId ? { workoutId } : {}) };
}
