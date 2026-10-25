import { useState } from 'react';
export function useWorkoutReconciliation() {
  const [reconciliations] = useState([]);
  return { reconciliations, reconcile: async () => {} };
}
