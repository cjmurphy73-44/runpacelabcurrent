import { useState } from 'react';
import { MatchCandidate } from '../services/workoutMatchingEngine';

export function useWorkoutReconciliation(_session?: any) {
  const [candidates] = useState<MatchCandidate[]>([]);
  const [isReconciling, setIsReconciling] = useState(false);
  const handleReconcile = async (_candidate?: any) => {};
  const reconcile = async () => {};
  return {
    candidates,
    isReconciling,
    handleReconcile,
    reconcile,
    reconciliations: [],
    loading: false
  };
}
