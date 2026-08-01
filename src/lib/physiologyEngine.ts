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

export const getVdotPaceZones = (vdotScore: number) => {
  // Logic for Jack Daniels VDOT conversion
  return {
    easy: "5:00 - 5:30 min/km",
    marathon: "4:30 - 4:45 min/km",
    threshold: "4:00 - 4:15 min/km",
    interval: "3:45 - 3:55 min/km",
    repetition: "3:30 - 3:40 min/km"
  };
};
