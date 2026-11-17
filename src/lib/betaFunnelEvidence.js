// Pure, offline-only commercial funnel evaluator. No telemetry collection or customer data.
// Counts must be independently verified, unique users in one fixed cohort/window.
// Null is "not measurable", never a fabricated zero-percent conversion.
export const BETA_FUNNEL_STAGES = Object.freeze([
  'landing', 'signup', 'connected', 'trusted_workout', 'returning_week_one', 'paid',
]);

export function evaluateBetaFunnel(counts, { evidenceVerified = false, minimumCohort = 10 } = {}) {
  if (!counts || typeof counts !== 'object' || Array.isArray(counts)) throw new TypeError('Expected cohort counts');
  if (!Number.isSafeInteger(minimumCohort) || minimumCohort < 10) throw new RangeError('Minimum cohort must be at least 10');
  const values = BETA_FUNNEL_STAGES.map((key) => {
    const value = counts[key];
    if (!Number.isSafeInteger(value) || value < 0) throw new TypeError(`Invalid ${key} count`);
    return value;
  });
  for (let i = 1; i < values.length; i++) {
    if (values[i] > values[i - 1]) throw new RangeError('Cohort stages must be nested and non-increasing');
  }
  const verified = evidenceVerified === true;
  const rates = {};
  for (let i = 1; i < BETA_FUNNEL_STAGES.length; i++) {
    const denominator = values[i - 1];
    rates[BETA_FUNNEL_STAGES[i]] = verified && denominator >= minimumCohort
      ? values[i] / denominator
      : null;
  }
  return {
    evidence_status: verified ? 'verified_counts' : 'assumptions_only',
    cohort_size: verified && values[0] >= minimumCohort ? values[0] : null,
    rates,
    suppressed: !verified || values[0] < minimumCohort,
  };
}
