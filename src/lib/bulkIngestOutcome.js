// Interpret a bulk-ingest response without treating an absent or malformed reply
// as a successful import. An unknown outcome is NOT proof of zero writes.
const uncertainOutcome = {
  file_name: "Batch",
  error: "Import outcome could not be verified. Check your workout log before retrying to avoid duplicates.",
};

function validCount(value) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

export function summarizeBulkIngestResponse(data) {
  const valid = data !== null
    && typeof data === "object"
    && typeof data.success === "boolean"
    && validCount(data.created_count)
    && (data.duplicate_count === undefined || validCount(data.duplicate_count))
    && Array.isArray(data.errors)
    && (data.failed_count === undefined || validCount(data.failed_count));

  // Never claim confirmed creations from an untrustworthy response envelope.
  const created = valid ? data.created_count : 0;
  const duplicates = valid ? (data.duplicate_count ?? 0) : 0;
  const errors = Array.isArray(data?.errors) ? data.errors : [];
  const failures = errors.filter((row) => !/^Skipped duplicate workout/.test(row?.error || ""));

  if (!valid) {
    failures.push({ ...uncertainOutcome });
  } else if ((data.success === false || (data.failed_count ?? 0) > failures.length) && failures.length === 0) {
    failures.push({
      file_name: "Batch",
      error: data.error || "Batch failed or reported unaccounted-for failures. Check saved workouts before retrying.",
    });
  } else if ((data.failed_count ?? 0) > failures.length) {
    failures.push({
      file_name: "Batch",
      error: "Additional file failures were reported without details. Check saved workouts before retrying.",
    });
  }

  return { created, duplicates, failures };
}
