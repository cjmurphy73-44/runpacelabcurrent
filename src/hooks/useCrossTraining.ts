import { useState, useEffect } from 'react';
import { analyzeFatigue, ReadinessRecord } from '../lib/crossTrainingEngine';

export const useCrossTraining = (history: ReadinessRecord[]) => {
  const [recommendationState, setRecommendationState] = useState({
    shouldCrossTrain: false,
    recommendation: null as string | null,
  });

  useEffect(() => {
    const result = analyzeFatigue(history);
    setRecommendationState(result);
  }, [history]);

  return recommendationState;
};
