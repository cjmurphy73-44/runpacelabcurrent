export const VALID_WORKOUT_SPORTS = ['running', 'walking', 'cycling', 'swimming', 'strength', 'triathlon', 'other'];

export function isWorkoutSport(value: unknown): value is string {
  return typeof value === 'string' && VALID_WORKOUT_SPORTS.includes(value);
}
