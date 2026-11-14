export interface WorkoutSession {
  date: string;
  durationSec: number;
  avgHr: number;
}

export const calculateTrimp = (
  durationSec: number,
  avgHr: number,
  maxHr: number,
  restHr: number,
  gender: 'M' | 'F'
): number => {
  const hrReserveFraction = (avgHr - restHr) / (maxHr - restHr);
  const durationMin = durationSec / 60;
  const genderCoeff = gender === 'M' ? 0.86 : 1.67;
  
  return durationMin * hrReserveFraction * 0.64 * Math.exp(1.92 * hrReserveFraction) * genderCoeff;
};

export const calculateTrainingLoads = (workoutHistory: WorkoutSession[], maxHr: number, restHr: number, gender: 'M' | 'F') => {
  // Simplification: In reality, we would group by date and iterate day-by-day
  const dailyLoads = workoutHistory.map(w => ({
    date: w.date,
    trimp: calculateTrimp(w.durationSec, w.avgHr, maxHr, restHr, gender)
  }));
  
  // Implementation of EWMA logic would follow here
  return dailyLoads;
};

import { getTrainingPaces } from '../science/vdot';

export const getVdotPaceZones = (vdotScore: number) => {
  if (!Number.isFinite(vdotScore) || vdotScore <= 0) return null;
  return getTrainingPaces(vdotScore);
};
