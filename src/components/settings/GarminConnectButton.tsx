import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Activity, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export function GarminConnectButton() {
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('garminSync', { action: 'authorize' });
      const data = res?.data || res;
      if (data?.authorize_url) {
        window.location.href = data.authorize_url;
      } else {
        alert(data?.error || 'Failed to initiate Garmin authorization');
        setLoading(false);
      }
    } catch (err: any) {
      alert(err?.response?.data?.error || err.message || 'Failed to connect Garmin');
      setLoading(false);
    }
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
