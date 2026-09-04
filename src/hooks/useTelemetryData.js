/**
 * UTILITY: parseLocalDate
 * Ensures dates are consistently handled as UTC midnights to prevent
 * timezone drift in telemetry calculations.
 */
export const parseLocalDate = (dateString) => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};

/**
 * HOOK: useTelemetryData
 * Normalizes raw logs into continuous telemetry arrays.
 */
import { useMemo } from 'react';

export const useTelemetryData = (rawWorkouts, referenceDate = '2026-09-02') => {
  return useMemo(() => {
    const history = Array(28).fill(0);
    const ref = parseLocalDate(referenceDate);

    rawWorkouts.forEach(({ date, load }) => {
      const workoutDate = parseLocalDate(date);
      const diffTime = ref.getTime() - workoutDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 3600 * 24));

      if (diffDays >= 0 && diffDays < 28) {
        history[27 - diffDays] += load;
      }
    });

    return history;
  }, [rawWorkouts, referenceDate]);
};
