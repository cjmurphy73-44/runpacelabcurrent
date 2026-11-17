// Honest ingest acknowledgement while full FIT archival remains unverified.
// This does not change storage, metrics, or the original source recording.
export function recordingTruncationNotice(stream, maxStoredSamples = 3600) {
  if (!Array.isArray(stream) || !Number.isSafeInteger(maxStoredSamples) || maxStoredSamples < 1) return null;
  if (stream.length <= maxStoredSamples) return null;
  const first = stream[0]?.time;
  const last = stream[stream.length - 1]?.time;
  const validTimes = typeof first === 'number' && Number.isFinite(first)
    && typeof last === 'number' && Number.isFinite(last) && last > first;
  const coverage = validTimes
    ? `recorded time ${first}s–${last}s`
    : 'recording time span unavailable';
  return `Original FIT has ${stream.length} samples (${coverage}); only the first ${maxStoredSamples} samples were saved to the workout detail. Full-recording display is not available yet; computed metrics may use the original FIT.`;
}
