// Advisory-only workload interpretation. ACWR is not a validated individual
// injury probability and cannot independently authorize progression.
export interface AdaptiveRecommendation {
  status: 'optimal' | 'caution' | 'danger';
  adjustmentPercentage: number;
  guidanceText: string;
}

export interface AdaptiveInput {
  acwr: number;
  chronic: number;
  acute: number;
  rpe: number;
}

export const calculateAdaptiveRecommendation = (input: AdaptiveInput): AdaptiveRecommendation => {
  const { acwr, chronic, acute, rpe } = input;
  if (![acwr, chronic, acute, rpe].every(Number.isFinite) || acwr < 0 || chronic <= 0 || acute < 0 || rpe < 0 || rpe > 10) {
    return { status: 'caution', adjustmentPercentage: 0, guidanceText: 'Insufficient or invalid workload data. Keep the current plan unchanged and verify recordings before considering an adjustment.' };
  }
  // No workload ratio can establish an injury diagnosis or a safe automatic
  // percentage adjustment. Changes require the broader athlete state and review.
  if (acwr > 1.5) {
    return { status: 'danger', adjustmentPercentage: 0, guidanceText: 'Recent load is substantially above the chronic baseline. Review training, recovery, symptoms and data quality before changing the plan.' };
  }
  if (acwr > 1.25 || rpe >= 9) {
    return { status: 'caution', adjustmentPercentage: 0, guidanceText: 'Elevated recent load or perceived exertion. Review recovery and upcoming intensity; no automatic change has been applied.' };
  }
  if (acwr < 0.8) {
    return { status: 'caution', adjustmentPercentage: 0, guidanceText: 'Recent load is below the chronic baseline. This alone does not justify increasing training. Review missed sessions, recovery and goals.' };
  }
  return { status: 'optimal', adjustmentPercentage: 0, guidanceText: 'Recent workload ratio is within the configured review range. This does not establish readiness or clearance; the plan is unchanged.' };
};
