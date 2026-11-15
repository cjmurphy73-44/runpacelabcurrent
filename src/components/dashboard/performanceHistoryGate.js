// Presentation gate only: does not independently certify historical CTL/ATL
// recomputation or stream validity. Never convert missing data into zero.
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const finite = (n) => typeof n === 'number' && Number.isFinite(n);

export function inspectPerformanceHistory(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return { ok: false, reason: 'No training-load history is available yet.' };
  const seen = new Set();
  let previous = '';
  for (const row of rows) {
    if (!row || typeof row.date !== 'string' || !datePattern.test(row.date)) {
      return { ok: false, reason: 'Training-load history has an invalid date.' };
    }
    const date = new Date(row.date + 'T00:00:00Z');
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== row.date || seen.has(row.date) || (previous && row.date <= previous)) {
      return { ok: false, reason: 'Training-load dates are incomplete or out of order.' };
    }
    seen.add(row.date);
    previous = row.date;
    if (![row.calculated_ctl, row.calculated_atl, row.calculated_tsb].every(finite)) {
      return { ok: false, reason: 'Fitness, fatigue or form values are missing.' };
    }
    if (![row.total_trimp, row.verified_trimp, row.summary_trimp].every(finite) ||
        row.total_trimp < 0 || row.verified_trimp < 0 || row.summary_trimp < 0 ||
        Math.abs(row.total_trimp - row.verified_trimp - row.summary_trimp) > 0.001 ||
        row.summary_trimp > 0) {
      return { ok: false, reason: 'Load provenance is incomplete or includes summary-derived training load.' };
    }
  }
  return { ok: true, rows };
}
