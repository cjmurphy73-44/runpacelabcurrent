import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Activity, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function GarminConnectButton() {
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    try {
      setLoading(true);
      const apiBase = import.meta.env.VITE_API_BASE_URL || '/api/v1';
      const baseUrl = apiBase.startsWith('http') 
        ? apiBase 
        : `${window.location.origin}${apiBase}`;

      const response = await fetch(`${baseUrl}/garmin/oauth/authorize`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to initiate Garmin connection');
      }

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No redirect URL returned from server');
      }
    } catch (err: any) {
      toast.error(err.message || 'Could not connect to Garmin');
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleConnect}
      disabled={loading}
      size="sm"
      className="bg-blue-600 hover:bg-blue-700 text-white"
    >
      {loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Activity className="w-4 h-4 mr-1" />}
      Connect Garmin
    </Button>
  );
}

export default GarminConnectButton;
