import { useMemo } from 'react';
import { calculateACWR, DailyMetrics } from '../lib/injuryEngine';

export function useInjuryPrediction(history: DailyMetrics[]) {
  return useMemo(() => {
    return calculateACWR(history);
  }, [history]);
}
