import React from 'react';

export function GarminConnectButton() {
  const handleConnect = () => {
    // Fallback directly to your production API host/path if VITE_API_BASE_URL isn't injected
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'https://api.trainpacelab.com/api/v1';
    
    const baseUrl = apiBase.startsWith('http') 
      ? apiBase 
      : `${window.location.origin}${apiBase}`;
    
    window.location.href = `${baseUrl}/garmin/oauth/authorize`;
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
