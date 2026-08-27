import { useState, useEffect } from 'react';
import { TrainingData, RiskAssessment, calculateACWR } from '../lib/injuryEngine';

export const useInjuryPrediction = (history: TrainingData[]) => {
  const [assessment, setAssessment] = useState<RiskAssessment | null>(null);

  useEffect(() => {
    if (history) {
      setAssessment(calculateACWR(history));
    }
  }, [history]);

  return assessment;
};
