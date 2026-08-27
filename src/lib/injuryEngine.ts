/**
 * injuryEngine.ts
 * 
 * Bayesian Load-Stress Engine:
 * Calculates ACWR (Acute-to-Chronic Workload Ratio) and 
 * determines injury risk zones based on training history.
 */

export interface TrainingData {
  tss: number;
  date: string;
}

export interface RiskAssessment {
  acwr: number;
  zone: 'Green' | 'Yellow' | 'Red';
  message: string;
}

export const calculateACWR = (history: TrainingData[]): RiskAssessment => {
  if (history.length < 28) {
    return { acwr: 0, zone: 'Green', message: 'Insufficient data for risk assessment.' };
  }

  const recent = history.slice(-7);
  const historic = history.slice(-28);

  const acuteLoad = recent.reduce((sum, day) => sum + day.tss, 0) / 7;
  const chronicLoad = historic.reduce((sum, day) => sum + day.tss, 0) / 28;

  const acwr = chronicLoad > 0 ? acuteLoad / chronicLoad : 0;

  let zone: 'Green' | 'Yellow' | 'Red' = 'Green';
  let message = 'Optimal training load.';

  if (acwr > 1.5) {
    zone = 'Red';
    message = 'High Risk: Overreach detected. Reduce volume immediately.';
  } else if (acwr > 1.3) {
    zone = 'Yellow';
    message = 'Caution: Elevated strain. Consider a recovery day.';
  }

  return { acwr, zone, message };
};
