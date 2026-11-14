/**
 * Presentation-only Home state selector. Never computes physiology or infers
 * freshness/quality from missing fields. Backend evidence must be explicit.
 */
export const HOME_STATES = Object.freeze({
  CURRENT: 'current', EMPTY: 'empty', PARTIAL: 'partial',
  STALE: 'stale', ERROR: 'error',
});

const validDate = (value) => typeof value === 'string' &&
  !Number.isNaN(Date.parse(value)) && Number.isFinite(Date.parse(value));

export function selectHomeState({
  hasTrainingHistory = false,
  loadFailed = false,
  dataQuality = null,
  lastSuccessfulAt = null,
  now = null,
  maxAgeMs = null,
} = {}) {
  if (loadFailed) return { state: HOME_STATES.ERROR, reason: 'load_failed' };
  if (!hasTrainingHistory) return { state: HOME_STATES.EMPTY, reason: 'no_training_history' };

  // Freshness must be established by a trusted timestamp AND explicit policy.
  if (validDate(lastSuccessfulAt) && validDate(now) &&
      Number.isFinite(maxAgeMs) && maxAgeMs >= 0) {
    const age = Date.parse(now) - Date.parse(lastSuccessfulAt);
    if (age >= 0 && age > maxAgeMs) {
      return { state: HOME_STATES.STALE, reason: 'freshness_window_exceeded' };
    }
  }
  if (dataQuality === 'partial' || dataQuality === 'insufficient') {
    return { state: HOME_STATES.PARTIAL, reason: 'incomplete_inputs' };
  }
  if (dataQuality === 'complete') {
    return { state: HOME_STATES.CURRENT, reason: 'explicit_complete_evidence' };
  }
  return { state: HOME_STATES.PARTIAL, reason: 'quality_not_verified' };
}

export function canRenderTrainingResponse({ points, method, source, updatedAt } = {}) {
  if (!Array.isArray(points) || points.length < 2 || !method ||
      !source || !validDate(updatedAt)) return false;
  let previous = -Infinity;
  return points.every((point) => {
    const timestamp = typeof point?.timestamp === 'string' ? Date.parse(point.timestamp) : NaN;
    if (!Number.isFinite(timestamp) || timestamp <= previous ||
        typeof point.value !== 'number' || !Number.isFinite(point.value)) return false;
    previous = timestamp;
    return true;
  });
}
