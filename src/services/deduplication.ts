/**
 * Activity Deduplication & Source Merging Engine
 *
 * Prevents double-counting training volume when activities are received
 * from multiple connected sources (e.g. Garmin API, Strava, Apple Health, OCR).
 */

export enum StreamSourcePriority {
  DIRECT_WEARABLE_API = 4, // Highest fidelity (native Garmin/Coros/Polar API)
  FITNESS_HUB = 3,         // Secondary hub (Strava, Apple Health)
  FILE_UPLOAD = 2,         // FIT / GPX manual upload
  VISION_OCR = 1,          // Screenshot extraction
}

export interface CandidateActivity {
  id?: string;
  userId: string;
  externalActivityId?: string;
  startTime: Date | string;
  distanceMeters: number;
  durationSeconds: number;
  streamSourcePriority: StreamSourcePriority;
  provider?: string;
}

export interface ExistingActivity {
  id: string;
  userId: string;
  externalActivityId?: string;
  startTime: Date;
  distanceMeters: number;
  durationSeconds: number;
  streamSourcePriority: StreamSourcePriority;
  provider?: string;
}

export interface DeduplicationResult {
  isDuplicate: boolean;
  matchType: 'EXACT_EXTERNAL_ID' | 'FUZZY_TIME_DISTANCE' | 'NONE';
  confidenceScore: number; // 0.0 to 1.0
  action: 'CREATE_NEW' | 'UPDATE_EXISTING' | 'REJECT_DUPLICATE';
  existingActivityId?: string;
}

/**
 * Evaluates whether an incoming candidate activity matches an existing activity for a user.
 *
 * Thresholds:
 * - Time window: Start times within 300 seconds (5 minutes)
 * - Distance delta: Distance within 5% or 200 meters
 * - Duration delta: Duration within 10% or 120 seconds
 */
export function evaluateDeduplication(
  candidate: CandidateActivity,
  existingActivities: ExistingActivity[]
): DeduplicationResult {
  const candidateStart = new Date(candidate.startTime).getTime();

  // 1. Exact External ID match check
  if (candidate.externalActivityId) {
    const exactMatch = existingActivities.find(
      (existing) =>
        existing.externalActivityId &&
        existing.externalActivityId === candidate.externalActivityId
    );

    if (exactMatch) {
      const shouldUpdate =
        candidate.streamSourcePriority > exactMatch.streamSourcePriority;
      return {
        isDuplicate: true,
        matchType: 'EXACT_EXTERNAL_ID',
        confidenceScore: 1.0,
        action: shouldUpdate ? 'UPDATE_EXISTING' : 'REJECT_DUPLICATE',
        existingActivityId: exactMatch.id,
      };
    }
  }

  // 2. Fuzzy time & distance matching window
  for (const existing of existingActivities) {
    const existingStart = new Date(existing.startTime).getTime();
    const timeDiffSeconds = Math.abs(candidateStart - existingStart) / 1000;

    // Time window constraint: Start time within 5 minutes (300s)
    if (timeDiffSeconds <= 300) {
      const distDiff = Math.abs(candidate.distanceMeters - existing.distanceMeters);
      const maxDistTolerance = Math.max(200, existing.distanceMeters * 0.05);

      const durDiff = Math.abs(candidate.durationSeconds - existing.durationSeconds);
      const maxDurTolerance = Math.max(120, existing.durationSeconds * 0.10);

      if (distDiff <= maxDistTolerance && durDiff <= maxDurTolerance) {
        const timeConfidence = 1 - timeDiffSeconds / 300;
        const distConfidence = 1 - distDiff / maxDistTolerance;
        const confidenceScore = Number(
          (0.5 * timeConfidence + 0.5 * distConfidence).toFixed(2)
        );

        const shouldUpdate =
          candidate.streamSourcePriority > existing.streamSourcePriority;

        return {
          isDuplicate: true,
          matchType: 'FUZZY_TIME_DISTANCE',
          confidenceScore,
          action: shouldUpdate ? 'UPDATE_EXISTING' : 'REJECT_DUPLICATE',
          existingActivityId: existing.id,
        };
      }
    }
  }

  return {
    isDuplicate: false,
    matchType: 'NONE',
    confidenceScore: 0.0,
    action: 'CREATE_NEW',
  };
}
