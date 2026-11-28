// Deterministic coaching evidence. No diagnoses, menstrual-health access,
// race predictions or autonomous plan prescriptions. Never feed raw journal data.
export function coachEvidenceBrief(report: any) {
  if (!report || report.state !== 'observational_only' || report.history?.state !== 'available') {
    return {
      state: 'unavailable' as const, reasons: ['Verified athlete history is not available.'],
      findings: [], adjustments_allowed: false, health_journal_used: false,
    };
  }
  const findings: { source: string; text: string; evidence: string }[] = [];
  const history = report.history;
  const coverage = history.session_coverage;
  const observed = Number(coverage?.days_with_saved_workouts || 0);
  findings.push({
    source: 'saved_workout_history',
    text: observed === 0 ? 'No saved workouts were found in the recent 28-day window.' :
      `${observed} of 28 days contain saved workouts. Unrecorded days are not confirmed rest.`,
    evidence: observed === 0 ? 'missing' : 'observed',
  });
  for (const unit of ['trimp', 'tss']) {
    const item = history.load_by_unit?.[unit];
    if (item?.sessions > 0) findings.push({
      source: 'training_load_' + unit,
      text: `${item.sessions} workouts have ${unit.toUpperCase()} data; ${item.total} total ${unit.toUpperCase()} units in the recorded window.`,
      evidence: item.estimated ? 'mixed_or_estimated' : 'recorded',
    });
  }
  for (const [key, title] of [
    ['hrv', 'HRV'], ['resting_hr', 'Resting heart rate'], ['sleep_duration_hours', 'Sleep duration'],
  ]) {
    const signal = history.recovery?.[key];
    if (signal?.state === 'descriptive_only') findings.push({
      source: 'recovery_' + key,
      text: `${title} is ${String(signal.direction).replaceAll('_', ' ')} based on ${signal.samples} earlier dated readings.`,
      evidence: 'personal_baseline_observation',
    });
  }
  for (const sport of ['running', 'cycling']) {
    const comparison = report.matched_efforts?.[sport];
    if (comparison?.state === 'descriptive_only' && Number.isFinite(comparison.relative_change_percent)) {
      findings.push({
        source: 'matched_effort_' + sport,
        text: `${sport}: ${Math.abs(comparison.relative_change_percent)}% ${comparison.relative_change_percent < 0 ? 'lower' : 'higher'} recorded ${comparison.metric === 'average_power_watts' ? 'power' : 'speed'} at similar recorded HR and duration across at least three dates in each window. This does not prove adaptation.`,
        evidence: 'descriptive_comparison',
      });
    }
  }
  const caveats = [
    'Training observations do not establish injury risk or medical clearance.',
    'Recommendations must respect the athlete’s own goals and be reviewed before changing a plan.',
    'Recorded training can be incomplete; TSS and TRIMP must never be added together.',
  ];
  if (coverage?.history_truncated) caveats.push('History was truncated, so do not infer progression.');
  if (report.matched_efforts?.running?.state !== 'descriptive_only' &&
      report.matched_efforts?.cycling?.state !== 'descriptive_only') {
    caveats.push('No sufficiently comparable running or cycling sessions to establish an effort trend.');
  }
  return {
    state: 'observational_only' as const, findings,
    adjustments_allowed: false, // a separate, explicitly approved API handles plan edits
    health_journal_used: false,
    caveats,
  };
}
