import React from 'react';

const ReconciliationModal = ({ conflict, onResolve, onDiscard }) => {
  if (!conflict) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold mb-4">Workout Conflict Detected</h2>
        <p className="mb-4">
          A workout already exists on {conflict.existingDate}. 
          The imported workout is for {conflict.stagedDate}.
        </p>
        <div className="flex justify-end gap-3">
          <button 
            onClick={onDiscard}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Discard Import
          </button>
          <button 
            onClick={() => onResolve(conflict)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Update Existing
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReconciliationModal;
