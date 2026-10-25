import { useState } from 'react';
export function useNorwegianWorkouts() {
  const [workouts] = useState([]);
  return { workouts, loading: false };
}
