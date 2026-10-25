import { useState } from 'react';
export function useWorkouts() {
  const [workouts] = useState([]);
  return { workouts, loading: false };
}
