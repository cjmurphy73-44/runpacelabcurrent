/**
 * Read-only running-specific context for Home.
 * Recorded activities are not evidence of a race, a threshold test or an injury.
 * Bounded history cannot prove an uninterrupted break when the result is full.
 */
export function runningCapabilitySnapshot(sessions, now = Date.now(), limit = 60) {
  const rows = Array.isArray(sessions) ? sessions : [];
  const truncated = rows.length >= limit;
  const valid = rows.filter((s) => {
    const d = Date.parse(s?.date);
    return typeof s?.sport === 'string' && Number.isFinite(d) && d <= now && d >= 0;
  });
  const isRunning = (s) => s.sport.toLowerCase().startsWith('run');
  const isCycling = (s) => s.sport.toLowerCase().startsWith('cycl');
  const recent = valid.filter((s) => now - Date.parse(s.date) <= 42 * 86400000);
  const runs = recent.filter(isRunning);
  const rides = recent.filter(isCycling);
  const previousRuns = valid.filter(isRunning).sort((a,b) => Date.parse(b.date)-Date.parse(a.date));
  const mostRecentRun = previousRuns[0] || null;
  const lastRunDays = mostRecentRun ? Math.floor((now-Date.parse(mostRecentRun.date))/86400000) : null;
  let status = 'unverified', title = 'Current running pace needs verification';
  if (truncated) {
    status = 'limited_history'; title = 'Activity history is limited';
  } else if (lastRunDays !== null && lastRunDays >= 42) {
    status = 'running_break'; title = 'Returning after a running break?';
  } else if (runs.length > 0 && runs.length < 4) {
    status = 'returning'; title = 'Rebuilding running consistency';
  } else if (runs.length >= 4) {
    status = 'active_unverified'; title = 'Running consistently, pace still unverified';
  }
  return {
    status, title, runs42: runs.length, rides42: rides.length,
    lastRunDate: mostRecentRun?.date || null, lastRunDays,
    truncated, historyCount: rows.length,
    confidence: 'unverified',
  };
}

export function paceTextFromSpeed(speed) {
  if (typeof speed !== 'number' || !Number.isFinite(speed) || speed <= 0) return null;
  const seconds = Math.round(1000 / speed);
  if (seconds < 120 || seconds > 1800) return null;
  return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}/km`;
}
