/** A plan cannot be committed while an active hold or unknown coach state exists. */
export function planCommitBlockReason(injury) {
  if (!injury || injury.loading || injury.error || injury.unavailable) {
    return "Confirm your current coaching status before adding this plan to the calendar.";
  }
  if (injury.level === "hold") {
    return "Running is paused by your coach hold. Review and resolve the hold before committing a new training plan.";
  }
  return null;
}
