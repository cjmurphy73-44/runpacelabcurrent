import React from 'react';

const ReconciliationModal = ({ conflict, onResolve, onDiscard }) => {
  if (!conflict) return null;

  return (
    <div className="fixed inset-0 bg-background/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-card text-card-foreground border border-border rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-heading font-bold mb-4">Workout Conflict Detected</h2>
        <p className="mb-4 text-muted-foreground">
          A workout already exists on {conflict.existingDate}. 
          The imported workout is for {conflict.stagedDate}.
        </p>
        <div className="flex justify-end gap-3">
          <button 
            onClick={onDiscard}
            className="px-4 py-2 min-h-[44px] bg-secondary text-secondary-foreground rounded hover:bg-secondary/80"
          >
            Discard Import
          </button>
          <button 
            onClick={() => onResolve(conflict)}
            className="px-4 py-2 min-h-[44px] bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Update Existing
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReconciliationModal;