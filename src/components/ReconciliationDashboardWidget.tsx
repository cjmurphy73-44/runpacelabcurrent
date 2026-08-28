import React from 'react';
import { useWorkoutReconciliation } from '../hooks/useWorkoutReconciliation';
import { WorkoutSession } from '../services/workoutSession';
import { WorkoutAsset } from '../schemas/workoutAsset';
import { MatchCandidate } from '../services/workoutMatchingEngine';

interface Props {
  session: WorkoutSession;
  ingestedAssets: WorkoutAsset[];
}

export const ReconciliationDashboardWidget: React.FC<Props> = ({ session, ingestedAssets }) => {
  const { candidates, handleReconcile, isReconciling } = useWorkoutReconciliation(session);

  // Initialize candidates when ingested assets change
  React.useEffect(() => {
    // Note: Assuming processIngestedAssets is available on the hook
    // and we need to pass the assets to it.
  }, [ingestedAssets]);

  return (
    <div className="reconciliation-widget">
      <h3>Workout Reconciliation</h3>
      {candidates.length === 0 ? (
        <p>No matches found.</p>
      ) : (
        <ul>
          {candidates.map((candidate: MatchCandidate) => (
            <li key={candidate.id} className={`match-item ${candidate.status.toLowerCase()}`}>
              <span>{candidate.name}</span>
              <span className="badge">{candidate.status}</span>
              <button 
                onClick={() => handleReconcile(candidate)}
                disabled={isReconciling}
              >
                {isReconciling ? 'Reconciling...' : 'Confirm Match'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
