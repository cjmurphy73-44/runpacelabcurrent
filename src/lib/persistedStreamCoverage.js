/**
 * Fail-closed persisted-stream coverage classification.
 * Do not claim full recording or calculate full-session zones from a prefix.
 * This is a pure helper; ingestion/storage changes remain separate.
 */
export function classifyPersistedStreamCoverage({ totalSamples, storedStream, durationSeconds }) {
  if (!Number.isSafeInteger(totalSamples) || totalSamples <= 0 ||
      !Array.isArray(storedStream) || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return { status: 'unknown', reason: 'invalid_metadata' };
  }
  const storedSamples = storedStream.length;
  if (storedSamples === 0) return { status: 'missing', reason: 'no_persisted_samples', totalSamples, storedSamples };
  if (storedSamples > totalSamples) return { status: 'unknown', reason: 'count_mismatch' };
  const start = storedStream[0]?.time;
  const end = storedStream[storedSamples - 1]?.time;
  if (typeof start !== 'number' || typeof end !== 'number' || !Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start) {
    return { status: 'unknown', reason: 'invalid_time_bounds' };
  }
  let hasLargeGap = false;
  for (let i = 1; i < storedSamples; i++) {
    const current = storedStream[i]?.time;
    const previous = storedStream[i - 1]?.time;
    if (typeof current !== 'number' || typeof previous !== 'number' ||
        !Number.isFinite(current) || !Number.isFinite(previous) || current <= previous) {
      return { status: 'unknown', reason: 'non_monotonic_time' };
    }
    if (current - previous > 5) hasLargeGap = true;
  }
  const spanSeconds = end - start;
  // Count equality alone cannot prove duration coverage; short prefix is partial.
  const countComplete = storedSamples === totalSamples;
  const durationComplete = start <= Math.max(5, durationSeconds * 0.02) &&
    spanSeconds >= durationSeconds * 0.95 && spanSeconds <= durationSeconds * 1.05 + 5;
  return {
    status: countComplete && durationComplete && !hasLargeGap ? 'complete' : 'partial',
    reason: !countComplete ? 'sample_count' : hasLargeGap ? 'timestamp_gap' : 'duration_coverage',
    totalSamples, storedSamples, spanSeconds,
  };
}

export function canUsePersistedStreamForFullSessionZones(coverage) {
  return coverage?.status === 'complete';
}
