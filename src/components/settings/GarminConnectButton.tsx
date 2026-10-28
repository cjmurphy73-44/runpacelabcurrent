import React from "react";
import { base44 } from "@/api/base44Client";

export function GarminConnectButton() {
  const handleConnect = async () => {
    try {
      const functionUrl = base44.functions.getFunctionUrl("garmin_oauth");
      window.location.href = `${functionUrl}?action=authorize`;
    } catch (err) {
      window.location.href = "/api/apps/trainpacelab/functions/garmin_oauth?action=authorize";
    }
  };

  return (
    <button onClick={handleConnect} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors cursor-pointer">
      Connect Garmin
    </button>
  );
}

export default GarminConnectButton;
