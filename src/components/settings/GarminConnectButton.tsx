import React from 'react';

export function GarminConnectButton() {
  const handleConnect = () => {
    window.location.href = '/api/v1/garmin/oauth/authorize';
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
