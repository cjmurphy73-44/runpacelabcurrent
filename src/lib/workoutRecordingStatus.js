import { recordingCoverage } from "./recordingCoverage";
import { hasVerifiedStreams } from "./streamValidity";

// Describes ONLY what the saved WorkoutSession proves. A provider connection,
// file extension or load_source does not prove original FIT retention or sync completion.
export function workoutRecordingStatus(workout) {
  const coverage = recordingCoverage(workout);
  const verified = hasVerifiedStreams(workout);
  if (verified && coverage && !coverage.partial) {
    return {
      state: "usable",
      title: "Recording samples available",
      detail: `Saved samples cover approximately ${coverage.percent}% of elapsed time (${coverage.sampleCount} points). Stream-dependent analysis can use these saved samples. This does not confirm the original file is retained or that provider sync is complete.`,
      action: null,
    };
  }
  if (coverage) {
    return {
      state: "partial",
      title: "Recording coverage needs review",
      detail: `Saved samples cover approximately ${coverage.percent}% of elapsed time (${coverage.sampleCount} points). ${verified ? "The stream passes current validity checks, but the saved timeline is incomplete." : "The saved samples do not pass the stream-validity checks for detailed analysis."} Original file retention and provider sync completion are unconfirmed.`,
      action: "/import",
    };
  }
  return {
    state: "missing",
    title: "Recording detail unavailable",
    detail: "A workout summary may be present, but no usable saved recording timeline can be confirmed. Import the original FIT or TCX file for stream-based analysis. Provider sync and original file retention are unconfirmed.",
    action: "/import",
  };
}
