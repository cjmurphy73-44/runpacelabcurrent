import React from 'react';
import { base44 } from '@/lib/base44Client';

export function GarminConnectButton() {
  const handleConnect = async () => {
    try {
      // Resolve base44 serverless function route dynamically via SDK
      const functionUrl = base44.functions.getFunctionUrl('garmin_oauth');
      window.location.href = `${functionUrl}?action=authorize`;
    } catch (err) {
      // Fallback relative Base44 proxy route if client SDK method is uninitialized
      window.location.href = '/api/apps/trainpacelab/functions/garmin_oauth?action=authorize';
    }
  };

  return (
    <button
      onClick={handleConnect}
      className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors cursor-pointer"
    >
      Connect Garmin
    </button>
  );
}

export default GarminConnectButton;
