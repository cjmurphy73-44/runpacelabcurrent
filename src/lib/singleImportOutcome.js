// The single-file endpoint supports TCX, but the bulk endpoint does not.
// Never treat a resolved SDK call or uploaded URL as persisted workout evidence.
// The returned session may be saved WITHOUT streams for long recordings.
export function singleImportOutcome(response) {
  const data = response?.data ?? response;
  if (!data || typeof data !== "object" || data.error || data.success !== true) {
    return { ok: false, message: typeof data?.error === "string" ? data.error : "Import not confirmed. Check your workout log before retrying." };
  }
  const id = data.workout_session?.id || data.workout_session_id;
  if (typeof id !== "string" || !id.trim()) {
    return { ok: false, message: "Import response did not confirm a saved workout. Check your workout log before retrying." };
  }
  if (data.attached === true) {
    return { ok: true, attached: true, recordingConfirmed: false,
      message: "Recording attached to an existing workout. Saved sample coverage is not confirmed by this response. Check the workout details." };
  }
  const samples = data.workout_session?.streams;
  if (!Array.isArray(samples) || samples.length < 60) {
    return { ok: true, attached: false, recordingConfirmed: false,
      message: "Workout summary saved, but a usable recording timeline was not returned. Long files may exceed the saved-stream limit. Check workout details before relying on zones or physiology." };
  }
  return { ok: true, attached: false, recordingConfirmed: false,
    message: "Workout saved with sample data. Full recording coverage and original-file retention are not confirmed. Check workout details." };
}
