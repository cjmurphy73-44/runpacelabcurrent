// The single-file endpoint supports TCX, but the bulk endpoint does not.
// Never treat a resolved SDK call or an uploaded file URL as persisted workout evidence.
export function singleImportOutcome(response) {
  const data = response?.data ?? response;
  if (!data || typeof data !== "object" || data.error || data.success !== true) {
    return { ok: false, message: typeof data?.error === "string" ? data.error : "Import not confirmed. Check your workout log before retrying." };
  }
  const id = data.workout_session?.id || data.workout_session_id;
  if (typeof id !== "string" || !id.trim()) {
    return { ok: false, message: "Import response did not confirm a saved workout. Check your workout log before retrying." };
  }
  return {
    ok: true,
    attached: data.attached === true,
    message: data.attached === true
      ? "Recording attached to an existing workout. Open your workout log to check saved sample coverage."
      : "Workout saved. Open your workout log to check saved sample coverage.",
  };
}
