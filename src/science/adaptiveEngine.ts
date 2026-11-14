/**
 * Legacy ACWR-facing adapter. ACWR is descriptive and cannot by itself justify
 * a training prescription, injury prediction, or an "optimal" load label.
 * See docs/SCIENCE_RESEARCH_AND_INTEGRATION.md.
 */
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
  if (![acwr, chronic, acute, rpe].every(Number.isFinite) ||
      acwr < 0 || chronic < 0 || acute < 0 || rpe < 0 || rpe > 10) {
    return {
      status: 'caution',
      adjustmentPercentage: 0,
      guidanceText: 'Training-load inputs are invalid or incomplete. No automatic adjustment is available.',
    };
  }

  return {
    status: 'caution',
    adjustmentPercentage: 0,
    guidanceText: 'Acute-to-chronic workload ratio is descriptive only. Review verified training history, recovery, symptoms and the athlete’s goals before changing a plan.',
  };
};
