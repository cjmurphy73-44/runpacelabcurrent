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
  const { acwr } = input;
  
  if (acwr > 1.5) {
    return {
      status: 'danger',
      adjustmentPercentage: -30,
      guidanceText: 'High ACWR detected. Significant risk of overtraining. Recommend reducing intensity by 30% and focusing on recovery.'
    };
  } else if (acwr > 1.25) {
    return {
      status: 'caution',
      adjustmentPercentage: -10,
      guidanceText: 'ACWR trending high. Monitor fatigue closely and consider a 10% reduction in volume.'
    };
  } else if (acwr < 0.8) {
    return {
      status: 'caution',
      adjustmentPercentage: 10,
      guidanceText: 'ACWR indicates potential underloading. Safe to progress training load by 10%.'
    };
  }
  
  return {
    status: 'optimal',
    adjustmentPercentage: 0,
    guidanceText: 'Load is optimal. Maintain current training volume.'
  };
};
