export type AdherenceStatus = 'ON_BOOK' | 'OVER_ACHIEVED' | 'UNDER_ACHIEVED' | 'MISSED';

export interface ScheduledWorkout {
  id: string;
  date: string;
  plannedDurationMinutes: number;
  plannedDistanceKm: number;
}

export interface ExecutedActivity {
  id: string;
  date: string;
  durationMinutes: number;
  distanceKm: number;
}

export interface ReconciliationResult {
  status: AdherenceStatus;
  coachRecommendation: string;
}

export const reconcileWorkout = (
  scheduled: ScheduledWorkout,
  executed: ExecutedActivity
): ReconciliationResult => {
  const durationDiff = executed.durationMinutes - scheduled.plannedDurationMinutes;
  const distanceDiff = executed.distanceKm - scheduled.plannedDistanceKm;

  // Simple heuristic for adherence
  if (Math.abs(durationDiff) < 5 && Math.abs(distanceDiff) < 0.5) {
    return { status: 'ON_BOOK', coachRecommendation: 'Great work! You hit your targets.' };
  } else if (durationDiff > 5 || distanceDiff > 0.5) {
    return { status: 'OVER_ACHIEVED', coachRecommendation: 'You exceeded your targets. Remember to prioritize recovery.' };
  } else if (durationDiff < -5 || distanceDiff < -0.5) {
    return { status: 'UNDER_ACHIEVED', coachRecommendation: 'You missed your targets. Let\'s adjust future sessions.' };
  } else {
    return { status: 'MISSED', coachRecommendation: 'Activity not found or significant discrepancy.' };
  }
};
