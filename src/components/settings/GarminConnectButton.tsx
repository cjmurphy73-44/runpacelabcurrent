import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Activity, Loader2 } from 'lucide-react';

export function GarminConnectButton() {
  const [loading, setLoading] = useState(false);

  const handleConnect = () => {
    setLoading(true);
    const apiBase = import.meta.env.VITE_API_BASE_URL || '/api/v1';
    const baseUrl = apiBase.startsWith('http') 
      ? apiBase 
      : `${window.location.origin}${apiBase}`;
    
    // Direct browser navigation allows the server's 303 RedirectResponse to work naturally
    window.location.href = `${baseUrl}/garmin/oauth/authorize`;
  };

  return (
    <Button
      onClick={handleConnect}
      disabled={loading}
      size="sm"
      className="bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
    >
      {loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Activity className="w-4 h-4 mr-1" />}
      Connect Garmin
    </Button>
  );
}

export default GarminConnectButton;
