import { useMemo } from 'react';
import { useWorkouts } from './useWorkouts';
import { usePaceCalibration } from './usePaceCalibration';

export const usePaceTrend = () => {
  const { workouts } = useWorkouts();
  const { calibration } = usePaceCalibration();

  const dataPoints = useMemo(() => {
    // Take last 14 days of workouts, filter for runs
    const recentWorkouts = workouts
      .filter((w) => w.type === 'run')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-14);

    if (recentWorkouts.length < 2) return [];

    // Calculate normalized delta (assuming calibration baseline is 1.0)
    // Map to 0-100 range for SVG viewbox
    return recentWorkouts.map((w, index) => ({
      x: (index / (recentWorkouts.length - 1)) * 200,
      y: 60 - Math.min(Math.max((w.pace - 0.5) * 100, 0), 60),
    }));
  }, [workouts]);

  return { dataPoints };
};
