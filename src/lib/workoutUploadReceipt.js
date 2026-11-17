// A successful transport response is not proof of a persisted workout.
// Mirrors the explicit outcomes returned by ingestWorkoutFile.
export function classifyWorkoutUploadReceipt(response) {
  const data = response?.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { kind: 'unconfirmed', message: 'Upload result could not be confirmed. Check your workout history before retrying.' };
  }
  if (typeof data.error === 'string' && data.error.trim()) {
    return { kind: 'error', message: 'Workout import was not completed. Please review the file and try again.' };
  }
  if (data.success !== true) {
    return { kind: 'unconfirmed', message: 'Upload result could not be confirmed. Check your workout history before retrying.' };
  }
  if (data.attached === true && typeof data.workout_session_id === 'string' && data.workout_session_id.trim()) {
    return { kind: 'success', message: 'Recording attached to an existing workout.' };
  }
  if (data.attached === false && typeof data.workout_session?.id === 'string' && data.workout_session.id.trim()) {
    return { kind: 'success', message: 'Workout saved successfully.' };
  }
  if (Number.isSafeInteger(data.imported_sessions_count) && data.imported_sessions_count > 0) {
    return { kind: 'success', message: `${data.imported_sessions_count} workout(s) saved successfully.` };
  }
  if (data.imported_sessions_count === 0 && Number.isSafeInteger(data.skipped_duplicates) && data.skipped_duplicates > 0) {
    return { kind: 'duplicate', message: 'No new workouts saved; matching workouts already exist.' };
  }
  return { kind: 'unconfirmed', message: 'Upload result could not be confirmed. Check your workout history before retrying.' };
}
