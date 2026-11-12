// Interpret one bulk-ingest response without confusing partially saved sessions
// with a complete failure or duplicate skips with unsuccessful writes.
export function summarizeBulkIngestResponse(data) {
  const created = Math.max(0, Number(data?.created_count) || 0);
  const duplicates = Math.max(0, Number(data?.duplicate_count) || 0);
  const errors = Array.isArray(data?.errors) ? data.errors : [];
  const failures = errors.filter((row) => !/^Skipped duplicate workout/.test(row?.error || ""));
  if (data?.success === false && failures.length === 0 && errors.length === 0) {
    failures.push({ file_name: "Batch", error: data?.error || "Batch failed — verify saved workouts before retrying." });
  }
  return { created, duplicates, failures };
}
