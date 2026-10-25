export interface WorkoutSession {
  id: string;
  date: string;
  sport: string;
  durationMinutes: number;
}
export async function getWorkoutSessions(): Promise<WorkoutSession[]> {
  return [];
}
