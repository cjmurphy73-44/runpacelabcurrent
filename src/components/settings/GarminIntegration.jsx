import React from 'react';
import { Button } from '@/components/ui/button';

export function GarminIntegration() {
  const handleConnect = () => {
    window.location.href = '/api/garmin/oauth/authorize';
  };

  return (
    <div className="p-4 bg-card rounded-lg border space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">Garmin Connect</h3>
          <p className="text-sm text-muted-foreground">
            Direct OAuth sync for automatic workout telemetry and webhook event streams.
          </p>
        </div>
        <Button onClick={handleConnect} className="cursor-pointer">
          Connect Garmin
        </Button>
      </div>
    </div>
  );
}

export default GarminIntegration;
