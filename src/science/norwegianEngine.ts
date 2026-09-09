// src/science/norwegianEngine.ts
import { getTrainingPaces, TrainingPaces } from './vdot';

export interface NorwegianIntervalPrescription {
  sessionType: 'double_threshold_am' | 'double_threshold_pm' | 'cruise_intervals';
  targetLactateMin: number; // e.g. 2.0 mmol/L
  targetLactateMax: number; // e.g. 3.5 mmol/L
  targetRpe: number;        // e.g. 6 - 7
  recommendedPaceSecPerKm: number;
  formattedPace: string;
  repeatDistanceMeters: number;
  repeatCount: number;
  recoverySeconds: number;
  totalWorkMeters: number;
  decouplingLimitPct: number; // typically 5.0%
}

export function generateNorwegianSession(
  vdot: number,
  format: '10x1000' | '5x2000' | '4x3000' = '5x2000'
): NorwegianIntervalPrescription {
  const paces = getTrainingPaces(vdot);
  // Norwegian threshold pacing sits slightly slower than traditional single T-pace (approx +2 to +4s / km)
  // to ensure blood lactate stays firmly below OBLA (2.0 - 3.5 mmol/L).
  const thresholdSecPerKm = paces.threshold.secPerKm + 3;
  const minutes = Math.floor(thresholdSecPerKm / 60);
  const seconds = Math.round(thresholdSecPerKm % 60);
  const formattedPace = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}/km`;

  let repeatDistance = 2000;
  let repeatCount = 5;
  let recoverySeconds = 60;

  if (format === '10x1000') {
    repeatDistance = 1000;
    repeatCount = 10;
    recoverySeconds = 45;
  } else if (format === '4x3000') {
    repeatDistance = 3000;
    repeatCount = 4;
    recoverySeconds = 90;
  }

  return {
    sessionType: 'double_threshold_am',
    targetLactateMin: 2.0,
    targetLactateMax: 3.5,
    targetRpe: 6.5,
    recommendedPaceSecPerKm: thresholdSecPerKm,
    formattedPace,
    repeatDistanceMeters: repeatDistance,
    repeatCount,
    recoverySeconds,
    totalWorkMeters: repeatDistance * repeatCount,
    decouplingLimitPct: 5.0,
  };
}

export function checkCardiacDecoupling(
  firstHalfAvgHr: number,
  firstHalfAvgSpeed: number,
  secondHalfAvgHr: number,
  secondHalfAvgSpeed: number
): { decouplingPct: number; isExceeded: boolean; status: string } {
  const ef1 = firstHalfAvgSpeed / Math.max(1, firstHalfAvgHr);
  const ef2 = secondHalfAvgSpeed / Math.max(1, secondHalfAvgHr);
  const decouplingPct = Number((((ef1 - ef2) / ef1) * 100).toFixed(2));
  const isExceeded = decouplingPct > 5.0;

  return {
    decouplingPct,
    isExceeded,
    status: isExceeded
      ? 'Warning: Aerobic decoupling > 5%. Glycogen depletion or heat strain detected.'
      : 'Optimal: Aerobic stability within elite threshold tolerance (< 5%).',
  };
}
