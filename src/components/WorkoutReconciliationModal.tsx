import React from 'react';
import { reconcileWorkout, ScheduledWorkout, ExecutedActivity } from '../lib/reconciliationEngine';

interface Props {
  scheduled: ScheduledWorkout;
  executed: ExecutedActivity;
  onSync: (result: any) => void;
}

export const WorkoutReconciliationModal: React.FC<Props> = ({ scheduled, executed, onSync }) => {
  const result = reconcileWorkout(scheduled, executed);

  return (
    <div className="p-4 bg-white rounded-lg shadow-md border border-gray-200">
      <h2 className="text-lg font-bold">Reconciliation Status: {result.status}</h2>
      <p className="mt-2 text-gray-700">{result.coachRecommendation}</p>
      <div className="mt-4 flex gap-2">
        <button 
          onClick={() => onSync(result)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Accept & Sync
        </button>
        <button className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">
          Flag Off-Book
        </button>
      </div>
    </div>
  );
};
