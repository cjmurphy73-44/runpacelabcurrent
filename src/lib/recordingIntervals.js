import { hasVerifiedStreams } from "./streamValidity";
import { summarizeRecordingWindows } from "../../base44/shared/recordingWindows.js";

export function recordingIntervals(workout, intervalSeconds = 600) {
  return hasVerifiedStreams(workout) ? summarizeRecordingWindows(workout.streams, intervalSeconds) : [];
}
