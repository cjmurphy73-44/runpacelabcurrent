// src/services/workoutMatchingEngine.ts
// Planned vs. Actual reconciliation — fuzzy-matches an ingested WorkoutSession to a
// scheduled TrainingPlanSession using temporal proximity (±1 day), sport modality,
// and a duration/distance tolerance window, then classifies the outcome as
// EXACT / COMPLETED_EXCEEDED / COMPLETED_SHORT / UNMATCHED. Pure logic — no I/O, so it
// is trivially testable and reused by both the dashboard hook and any future backend
// auto-link step.

export interface ScheduledWorkout {
  id: string;
  date: string; // YYYY-MM-DD
  sport: string;
  targetDurationMinutes?: number;
  targetDistanceKm?: number;
  status?: string;
}

export interface IngestedWorkoutData {
  sessionId: string;
  date: string; // YYYY-MM-DD
  sport: string;
  durationMinutes: number;
  distanceKm?: number;
}

export type MatchStatus = 'EXACT' | 'COMPLETED_EXCEEDED' | 'COMPLETED_SHORT' | 'UNMATCHED';

export interface MatchResult {
  scheduledWorkoutId: string | null;
  sessionId: string;
  matchStatus: MatchStatus;
  confidenceScore: number; // 0..1
  varianceDetails: {
    durationVariancePercent: number;
    distanceVariancePercent?: number;
    dayOffset: number;
    completionRatio: number; // actualDuration / prescribedDuration (0..n); nullish when no prescribed duration
  };
  scheduled?: ScheduledWorkout;
}

const DURATION_TOLERANCE = 0.20;   // ±20% on prescribed duration
const DISTANCE_TOLERANCE = 0.25;   // ±25% on prescribed distance
const EXACT_VARIANCE = 0.05;        // within ±5% counts as "on plan"
const MAX_DAY_OFFSET = 1;          // same day or ±1 day

function normalizeSport(sport: string): string {
  return String(sport || '').toLowerCase().trim();
}

// Treat YYYY-MM-DD as UTC midnight so day math is stable across timezones.
function parseDay(dateStr: string): number {
  return Date.parse(dateStr + 'T00:00:00Z');
}

export class WorkoutMatchingEngine {
  /**
   * Evaluate an ingested workout against a list of candidate scheduled workouts and
   * return the best (highest-confidence) match, or an UNMATCHED result.
   */
  findBestMatch(ingested: IngestedWorkoutData, candidates: ScheduledWorkout[]): MatchResult {
    const ingSport = normalizeSport(ingested.sport);
    let bestMatch: ScheduledWorkout | null = null;
    let bestScore = -1;
    let bestDetails = { durationVariancePercent: 0, distanceVariancePercent: 0, dayOffset: 0 };

    for (const scheduled of candidates) {
      // 1. Sport modality must match.
      if (normalizeSport(scheduled.sport) !== ingSport) continue;

      // 2. Temporal anchor: same day or ±1 day only.
      const dayOffset = this.calculateDayOffset(ingested.date, scheduled.date);
      if (Math.abs(dayOffset) > MAX_DAY_OFFSET) continue;

      // 3. Duration variance (±20% window) when the plan prescribed a duration.
      const hasDurationTarget = !!scheduled.targetDurationMinutes && scheduled.targetDurationMinutes > 0;
      let durationVariance = 0;
      if (hasDurationTarget) {
        durationVariance = (ingested.durationMinutes - scheduled.targetDurationMinutes!) / scheduled.targetDurationMinutes!;
        if (Math.abs(durationVariance) > DURATION_TOLERANCE) continue;
      }

      // 4. Distance variance (±25% window) when both sides carry a distance.
      const hasDistanceTarget = !!scheduled.targetDistanceKm && scheduled.targetDistanceKm > 0 && ingested.distanceKm != null;
      let distanceVariance = 0;
      if (hasDistanceTarget) {
        distanceVariance = (ingested.distanceKm! - scheduled.targetDistanceKm!) / scheduled.targetDistanceKm!;
        if (Math.abs(distanceVariance) > DISTANCE_TOLERANCE) continue;
      }

      // Confidence: 50% temporal closeness + 50% duration accuracy.
      const temporalScore = 1 - Math.abs(dayOffset) * 0.3;
      const durationScore = hasDurationTarget ? 1 - Math.min(Math.abs(durationVariance), DURATION_TOLERANCE) / DURATION_TOLERANCE : 1;
      const totalScore = temporalScore * 0.5 + durationScore * 0.5;

      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestMatch = scheduled;
        bestDetails = {
          durationVariancePercent: Math.round(durationVariance * 100),
          distanceVariancePercent: hasDistanceTarget ? Math.round(distanceVariance * 100) : undefined,
          dayOffset,
        };
      }
    }

    if (!bestMatch) {
      return {
        scheduledWorkoutId: null,
        sessionId: ingested.sessionId,
        matchStatus: 'UNMATCHED',
        confidenceScore: 0,
        varianceDetails: { durationVariancePercent: 0, dayOffset: 0, completionRatio: NaN },
      };
    }

    let matchStatus: MatchStatus = 'EXACT';
    const dv = bestDetails.durationVariancePercent;
    if (dv > EXACT_VARIANCE * 100) matchStatus = 'COMPLETED_EXCEEDED';
    else if (dv < -EXACT_VARIANCE * 100) matchStatus = 'COMPLETED_SHORT';

    const ratio =
      bestMatch.targetDurationMinutes && bestMatch.targetDurationMinutes > 0
        ? ingested.durationMinutes / bestMatch.targetDurationMinutes
        : NaN;

    return {
      scheduledWorkoutId: bestMatch.id,
      sessionId: ingested.sessionId,
      matchStatus,
      confidenceScore: parseFloat(bestScore.toFixed(2)),
      varianceDetails: { ...bestDetails, completionRatio: parseFloat(ratio.toFixed(2)) },
      scheduled: bestMatch,
    };
  }

  /** Run every ingested session through the matcher. */
  matchAll(ingested: IngestedWorkoutData[], candidates: ScheduledWorkout[]): MatchResult[] {
    return ingested.map((i) => this.findBestMatch(i, candidates));
  }

  /** Whole-day offset between two YYYY-MM-DD strings. */
  calculateDayOffset(dateA: string, dateB: string): number {
    const diffMs = parseDay(dateA) - parseDay(dateB);
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
  }
}

export const workoutMatchingEngine = new WorkoutMatchingEngine();