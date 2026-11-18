/**
 * Confidence metadata for a running threshold estimate.
 * A gap in logged running is not proof of injury or a measured loss of fitness.
 * Never modify the athlete's stored VDOT/threshold from this classification.
 * Input history can be windowed; no observed run must never be called proof
 * of a specific length of injury or detraining.
 */
export function classifyRunningCalibration(sessions, observedRunCount, now = Date.now(), options = {}) {
  const valid = (Array.isArray(sessions) ? sessions : [])
    .filter((s) => typeof s?.sport === 'string' && s.sport.toLowerCase().startsWith('run'))
    .map((s) => {
      const dateMs = typeof s.date === 'string' ? Date.parse(s.date) : NaN;
      return dateMs;
    })
    .filter((time) => Number.isFinite(time) && time <= now && time >= 0);
  const recentRunAgeDays = valid.length ? (now - Math.max(...valid)) / 86400000 : null;
  // A capped session query may omit a more recent run. Never infer a
  // measured running interruption from incomplete workout history.
  if (options.historyTruncated === true) {
    return { status: 'incomplete_history', currentVerified: false,
      recentRunAgeDays: recentRunAgeDays === null ? null : Math.floor(recentRunAgeDays) };
  }
  if (recentRunAgeDays !== null && recentRunAgeDays >= 42) {
    return { status: 'running_gap', currentVerified: false, recentRunAgeDays: Math.floor(recentRunAgeDays) };
  }
  if (!Number.isFinite(observedRunCount) || observedRunCount < 3) {
    return {
      status: 'needs_threshold_evidence',
      currentVerified: false,
      recentRunAgeDays: recentRunAgeDays === null ? null : Math.floor(recentRunAgeDays),
    };
  }
  return {
    status: 'provisional',
    currentVerified: false,
    recentRunAgeDays: recentRunAgeDays === null ? null : Math.floor(recentRunAgeDays),
  };
}
