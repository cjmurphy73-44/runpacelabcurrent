// Honest ingest acknowledgement while full FIT archival remains unverified.
// This does not change storage, metrics, or the original source recording.
export function recordingTruncationNotice(stream, maxStoredSamples = 3600) {
  if (!Array.isArray(stream) || !Number.isSafeInteger(maxStoredSamples) || maxStoredSamples < 1) return null;
  if (stream.length <= maxStoredSamples) return null;
  const first = stream[0]?.time;
  const last = stream[stream.length - 1]?.time;
  // A plausible pair of endpoints cannot establish coverage when the middle
  // contains missing, negative or non-monotonic recording timestamps.
  let previous = -Infinity;
  const validTimes = stream.every((sample) => {
    const time = sample?.time;
    if (typeof time !== 'number' || !Number.isFinite(time) || time < 0 || time <= previous) return false;
    previous = time;
    return true;
  }) && last > first;
  const coverage = validTimes
    ? `recorded time ${first}s–${last}s`
    : 'recording time span unavailable';
  return `Source recording has ${stream.length} samples (${coverage}); the workout detail payload is limited to the first ${maxStoredSamples} samples. Full-recording display is not available yet; computed metrics may use the full source recording.`;
}
