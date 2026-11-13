// Fail-closed presentation gate for historical DailyMetrics load charts.
// Existing total_trimp can contain a TSS fallback, so its name is NOT proof of units.
export function weeklyLoadPresentation(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { status: 'unavailable', message: 'No training-load history is available yet.', points: [] };
  }
  const valid = rows.every((row) =>
    row && typeof row.date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(row.date) &&
    row.load_metric === 'trimp' &&
    row.load_contract_verified === true &&
    [row.total_trimp, row.verified_trimp, row.summary_trimp].every(
      (n) => typeof n === 'number' && Number.isFinite(n) && n >= 0,
    ) &&
    Math.abs(row.total_trimp - row.verified_trimp - row.summary_trimp) < 0.011
  );
  if (!valid) {
    return {
      status: 'unverified',
      message: 'Weekly load is hidden because historical units or recording provenance have not been verified. Your workout history is still available.',
      points: [],
    };
  }
  return { status: 'verified', message: 'Verified TRIMP units, with recorded and estimated contributions kept separate.', points: rows };
}
