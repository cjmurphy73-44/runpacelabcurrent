// Matching is a suggestion, not evidence that a scheduled workout was done.
// Reject ambiguous many-to-one suggestions before any explicit confirmation.
export function canConfirmUniqueMatch(match, candidates) {
  if (!match?.sessionId || !match?.scheduledWorkoutId ||
      !Array.isArray(candidates) || !candidates.includes(match)) return false;
  const valid = candidates.filter(m => m?.sessionId && m?.scheduledWorkoutId);
  return valid.filter(m => m.sessionId === match.sessionId).length === 1 &&
    valid.filter(m => m.scheduledWorkoutId === match.scheduledWorkoutId).length === 1;
}
