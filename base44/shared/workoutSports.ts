export const VALID_WORKOUT_SPORTS = [
  'running',
  'trail_running',
  'walking',
  'hiking',
  'cycling',
  'mountain_biking',
  'e_bike',
  'swimming',
  'rowing',
  'kayaking',
  'cross_country_skiing',
  'downhill_skiing',
  'snowboarding',
  'strength',
  'yoga',
  'elliptical',
  'stair_climbing',
  'tennis',
  'soccer',
  'climbing',
  'boxing',
  'triathlon',
  'other',
];

export function isWorkoutSport(value: unknown): value is string {
  return typeof value === 'string' && VALID_WORKOUT_SPORTS.includes(value);
}
