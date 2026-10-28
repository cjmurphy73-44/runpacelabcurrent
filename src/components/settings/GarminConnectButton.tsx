import React from 'react';

export function GarminConnectButton() {
  const handleConnect = () => {
    // Default to relative /api/v1 so requests stay on trainpacelab.com
    const apiBase = import.meta.env.VITE_API_BASE_URL || '/api/v1';
    
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
