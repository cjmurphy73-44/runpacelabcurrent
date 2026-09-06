import { WorkoutTelemetry, BiometricEntry } from '../store/useTelemetryStore';

export interface RecoveryScores {
  cardiovascularReadiness: number; // 0 - 100
  neuromuscularReadiness: number;  // 0 - 100
  overallReadiness: number;        // 0 - 100
  recommendedModality: 'running' | 'cycling' | 'swimming' | 'rowing' | 'rest';
  statusLabel: string;
}

export function computeRecoveryScores(
  workouts: WorkoutTelemetry[],
  biometrics?: BiometricEntry
): RecoveryScores {
  // Default fallback if biometrics not logged yet
  const rhr = biometrics?.restingHeartRate ?? 52;
  const hrv = biometrics?.hrvMs ?? 70;
  const sleep = biometrics?.sleepScore ?? 80;
  const soreness = biometrics?.subjectiveSoreness ?? 2;

  // Recent cumulative load from last 48h
  const recentWorkouts = workouts.slice(-3);
  const recentMechanical = recentWorkouts.reduce((acc, w) => acc + w.mechanicalLoad, 0);
  const recentCardio = recentWorkouts.reduce((acc, w) => acc + w.cardioLoad, 0);

  // Cardio readiness: based on HRV (higher is better) and RHR deviation (lower RHR vs baseline 52 is better)
  const hrvScore = Math.min(100, Math.max(0, (hrv / 90) * 100));
  const rhrScore = Math.min(100, Math.max(0, (1 - Math.max(0, rhr - 50) / 30) * 100));
  const sleepScoreNorm = Math.min(100, Math.max(0, sleep));
  
  const cardioLoadPenalty = Math.min(40, (recentCardio / 1200) * 40);
  const cardiovascularReadiness = Math.round(
    ((hrvScore * 0.4) + (rhrScore * 0.3) + (sleepScoreNorm * 0.3)) - cardioLoadPenalty
  );

  // Neuromuscular readiness: based on soreness and recent mechanical impact load (running has high impact)
  const sorenessScore = Math.max(0, 100 - (soreness * 18));
  const mechanicalPenalty = Math.min(50, (recentMechanical / 1000) * 50);
  const neuromuscularReadiness = Math.round(
    Math.max(10, sorenessScore - mechanicalPenalty)
  );

  const overallReadiness = Math.round((cardiovascularReadiness * 0.5) + (neuromuscularReadiness * 0.5));

  let recommendedModality: RecoveryScores['recommendedModality'] = 'running';
  let statusLabel = 'Optimal Adaptation Window';

  if (overallReadiness < 50) {
    recommendedModality = 'rest';
    statusLabel = 'Mandatory Recovery Protocol';
  } else if (neuromuscularReadiness < 65 && cardiovascularReadiness >= 70) {
    recommendedModality = 'swimming'; // Non-impact aerobic flush
    statusLabel = 'Low-Impact Active Recovery';
  } else if (cardiovascularReadiness < 65 && neuromuscularReadiness >= 70) {
    recommendedModality = 'cycling'; // High leg freshness, low cardio reserve
    statusLabel = 'Zone 2 Mechanical Steady State';
  }

  return {
    cardiovascularReadiness: Math.max(5, Math.min(100, cardiovascularReadiness)),
    neuromuscularReadiness: Math.max(5, Math.min(100, neuromuscularReadiness)),
    overallReadiness: Math.max(5, Math.min(100, overallReadiness)),
    recommendedModality,
    statusLabel
  };
}
