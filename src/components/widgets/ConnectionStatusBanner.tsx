import React from 'react';
import { useConnectionStatus } from '../../hooks/useConnectionStatus';

export const ConnectionStatusBanner: React.FC = () => {
  const { isConnected, isChecking, lastError, retry } = useConnectionStatus();

  if (isConnected) {
    return null; // Hidden when everything is healthy
  }

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-200 px-4 py-2 text-sm flex items-center justify-between sticky top-0 z-50 backdrop-blur-sm">
      <div className="flex items-center space-x-2">
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        <span>
          <strong>Connection Alert:</strong> {lastError || 'Unable to reach backend services.'}
        </span>
      </div>
      <button
        onClick={retry}
        disabled={isChecking}
        className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-100 rounded text-xs font-medium transition-colors disabled:opacity-50"
      >
        {isChecking ? 'Checking...' : 'Retry Now'}
      </button>
    </div>
  );
};
