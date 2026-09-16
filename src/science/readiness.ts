/**
 * Provider-agnostic holistic readiness scoring engine.
 * 
 * Computes a 0-100 TrainPaceLab readiness score by normalizing recovery biometrics
 * (HRV, Resting HR, Sleep Score) against rolling baselines and blending current TSB (Form).
 * 
 * @citation TrainPaceLab Physiological Scoring Architecture
 */

export interface DailyMetricsInput {
  hrvMs?: number | null;
  sleepScore?: number | null;
  restingHr?: number | null;
  stressScore?: number | null; // Optional (0-100 or similar)
  bodyBattery?: number | null; // Optional (0-100)
}

export interface BaselineInput {
  hrvMean?: number | null;
  hrvStdDev?: number | null;
  restingHrMean?: number | null;
  restingHrStdDev?: number | null;
}

export interface ReadinessResult {
  score: number; // 0-100 unified score
  status: 'Optimal' | 'Good' | 'Moderate' | 'High Fatigue' | 'Insufficient Data';
  components: {
    hrvScore: number; // 0-100 normalized
    sleepScore: number; // 0-100 normalized
    restingHrScore: number; // 0-100 normalized
    tsbScore: number; // 0-100 normalized from TSB
  };
  details: {
    hrvZScore?: number;
    restingHrDelta?: number;
    tsb?: number;
  };
}

/**
 * Computes holistic readiness score given current metrics, baselines, and TSB (Form).
 */
export function computeHolisticReadiness(
  current: DailyMetricsInput,
  baseline?: BaselineInput,
  tsb?: number | null
): ReadinessResult {
  let hrvComponent = 70; // neutral fallback
  let sleepComponent = current.sleepScore != null ? Math.max(0, Math.min(100, current.sleepScore)) : 70;
  let rhrComponent = 70;
  let tsbComponent = 70;

  let hrvZScore: number | undefined;
  let rhrDelta: number | undefined;

  let validCount = 0;

  // 1. HRV Z-Score Normalization
  if (current.hrvMs != null && baseline?.hrvMean != null && baseline.hrvStdDev != null && baseline.hrvStdDev > 0) {
    hrvZScore = (current.hrvMs - baseline.hrvMean) / baseline.hrvStdDev;
    // Map Z-score (-2 to +2) to 0-100 score (Z=0 -> 70, Z=+2 -> 100, Z=-2 -> 40)
    hrvComponent = Math.max(0, Math.min(100, 70 + hrvZScore * 15));
    validCount++;
  } else if (current.hrvMs != null) {
    // Fallback if no baseline: absolute scale (e.g., 20ms to 100ms mapped to 30-100)
    hrvComponent = Math.max(20, Math.min(100, 30 + (current.hrvMs / 100) * 70));
    validCount++;
  }

  // 2. Sleep Score Direct Scaling
  if (current.sleepScore != null) {
    sleepComponent = Math.max(0, Math.min(100, current.sleepScore));
    validCount++;
  }

  // 3. Resting HR Delta Penalty
  if (current.restingHr != null && baseline?.restingHrMean != null) {
    rhrDelta = current.restingHr - baseline.restingHrMean;
    // Elevated RHR is bad (+bpm -> penalty). Each bpm above mean subtracts 5 points from 70.
    rhrComponent = Math.max(0, Math.min(100, 70 - rhrDelta * 5));
    validCount++;
  } else if (current.restingHr != null) {
    // Fallback based on absolute RHR (lower is better, e.g., 40-80 bpm)
    rhrComponent = Math.max(0, Math.min(100, 100 - (current.restingHr - 40) * 1.5));
    validCount++;
  }

  // 4. Form (TSB) Modifier (-30 to +30 TSB mapped to 30-100)
  if (tsb != null) {
    // TSB around 0 to +15 is optimal fresh. TSB < -20 is high fatigue.
    const clampedTsb = Math.max(-30, Math.min(30, tsb));
    tsbComponent = Math.max(0, Math.min(100, 70 + (clampedTsb / 30) * 30));
    validCount++;
  }

  // Compute weighted composite
  // Weights: Sleep 30%, HRV 30%, RHR 20%, TSB 20%
  const compositeScore = Math.round(
    sleepComponent * 0.30 +
    hrvComponent * 0.30 +
    rhrComponent * 0.20 +
    tsbComponent * 0.20
  );

  let status: ReadinessResult['status'] = 'Moderate';
  if (validCount === 0 && current.sleepScore == null && current.hrvMs == null && current.restingHr == null && tsb == null) {
    status = 'Insufficient Data';
  } else if (compositeScore >= 85) {
    status = 'Optimal';
  } else if (compositeScore >= 70) {
    status = 'Good';
  } else if (compositeScore >= 50) {
    status = 'Moderate';
  } else {
    status = 'High Fatigue';
  }

  return {
    score: compositeScore,
    status,
    components: {
      hrvScore: Math.round(hrvComponent),
      sleepScore: Math.round(sleepComponent),
      restingHrScore: Math.round(rhrComponent),
      tsbScore: Math.round(tsbComponent),
    },
    details: {
      hrvZScore,
      restingHrDelta: rhrDelta,
      tsb: tsb ?? undefined,
    }
  };
}
