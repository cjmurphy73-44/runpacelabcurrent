/**
 * Deterministic presentation for the existing Today workspace.
 * A recovery score or training-load balance is never medical clearance.
 * Session load and sport classification are retained as recorded, not inferred.
 */
export function buildTodayDecision({ dailyMetrics = [], workouts = [], athlete = {}, now = Date.now() } = {}) {
  const sortedMetrics = [...(Array.isArray(dailyMetrics) ? dailyMetrics : [])]
    .filter((m) => m && Number.isFinite(Date.parse(m.date)))
    .sort((a,b) => Date.parse(b.date)-Date.parse(a.date));
  const latestMetric = sortedMetrics[0] || null;
  const ageDays = latestMetric ? Math.floor((now - Date.parse(latestMetric.date)) / 86400000) : null;
  const timely = ageDays !== null && ageDays >= 0 && ageDays <= 2;
  const score = timely && typeof latestMetric.readiness_score === 'number'
    && Number.isFinite(latestMetric.readiness_score)
    && latestMetric.readiness_score >= 0 && latestMetric.readiness_score <= 100
      ? latestMetric.readiness_score : null;
  const tsb = typeof athlete.current_tsb === 'number' && Number.isFinite(athlete.current_tsb)
    ? athlete.current_tsb : null;

  let readinessLabel = 'Readiness unavailable';
  let readinessDetail = 'No recent measured readiness score. Check your recovery and symptoms before deciding on intensity.';
  if (score !== null) {
    readinessLabel = `Readiness ${Math.round(score)}/100`;
    readinessDetail = score < 40
      ? 'Recent recovery signals indicate low readiness. Consider recovery or a lighter session.'
      : score < 70
        ? 'Readiness is moderate. Review the planned session against how you feel.'
        : 'Recovery signals look favourable, but they do not establish injury clearance.';
  } else if (ageDays !== null && ageDays > 2) {
    readinessDetail = 'The latest readiness reading is older than two days, so it is not used as today’s score.';
  }
  const formDetail = tsb === null
    ? 'Training-load balance is unavailable.'
    : tsb <= -25
      ? `Form ${Math.round(tsb)}: substantial accumulated load-related fatigue.`
      : `Form ${tsb >= 0 ? '+' : ''}${Math.round(tsb)}: training-load balance, not medical clearance.`;

  const rows = (Array.isArray(workouts) ? workouts : [])
    .filter((w) => w && Number.isFinite(Date.parse(w.date)))
    .sort((a,b) => Date.parse(b.date)-Date.parse(a.date));
  const last = rows[0] || null;
  const sport = last && typeof last.sport === 'string' ? last.sport.toLowerCase() : null;
  const lastWorkout = !last
    ? { title: 'No recorded workout', detail: 'Sync your watch or import a workout to see your last session.', recorded: false }
    : {
      title: `Last workout: ${sport || 'activity'}`,
      detail: [
        last.date,
        Number.isFinite(last.duration_minutes) && last.duration_minutes > 0 ? `${Math.round(last.duration_minutes)} min` : null,
        Number.isFinite(last.distance_km) && last.distance_km > 0 ? `${last.distance_km} km` : null,
      ].filter(Boolean).join(' · '),
      recorded: true,
      sport,
      loadEvidence: last.load_source === 'stream'
        ? 'Load from recorded stream'
        : last.load_source === 'summary'
          ? 'Estimated from workout summary'
          : 'Training-load measurement unavailable',
    };

  const guidance = score !== null && score < 40
    ? 'Consider recovery or lighter training'
    : tsb !== null && tsb <= -25
      ? 'Review accumulated fatigue before intensity'
      : 'Review today’s planned session';
  return { readinessLabel, readinessDetail, formDetail, lastWorkout, guidance,
    score, readinessAgeDays: ageDays, formAvailable: tsb !== null };
}
