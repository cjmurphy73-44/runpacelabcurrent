/**
 * Safety boundary for CTL/ATL/TSB and Banister ODE persistence.
 *
 * The legacy implementation silently treated missing calendar days as zero
 * and read an unbounded entity list without verifying pagination. The
 * underlying calculations remain available in git history for a reviewed
 * future integration, but must not write inaccurate athlete metrics.
 */
export async function recomputeCTLATLTSB(base44: any, athlete_id: string) {
  if (!athlete_id || !base44?.asServiceRole?.entities) {
    return { success: false, code: 'INVALID_RECALC_CONTEXT',
      reason: 'Missing athlete or backend context', date: null,
      ctl: null, atl: null, tsb: null };
  }

  const READ_LIMIT = 5000;
  try {
    const [sessions, dailyMetrics] = await Promise.all([
      base44.asServiceRole.entities.WorkoutSession.filter({ athlete_id }, 'date', READ_LIMIT),
      base44.asServiceRole.entities.DailyMetrics.filter({ athlete_id }, 'date', READ_LIMIT),
    ]);
    if (!Array.isArray(sessions) || !Array.isArray(dailyMetrics) ||
        sessions.length >= READ_LIMIT || dailyMetrics.length >= READ_LIMIT) {
      return { success: false, code: 'INCOMPLETE_HISTORY_READ',
        reason: 'History may be truncated; no training-load metrics were changed.',
        date: null, ctl: null, atl: null, tsb: null };
    }
    // Read completeness alone does not verify athlete-local date boundaries,
    // independently confirmed rest, or an atomic snapshot across imports.
    return { success: false, code: 'HISTORY_RECALC_NOT_YET_SAFE',
      reason: 'Athlete-local dates, daily load provenance, and concurrent-import consistency require staging verification before CTL/ATL recalculation.',
      date: null, ctl: null, atl: null, tsb: null };
  } catch {
    return { success: false, code: 'HISTORY_READ_FAILED',
      reason: 'Training history could not be verified; no metrics were changed.',
      date: null, ctl: null, atl: null, tsb: null };
  }
}
