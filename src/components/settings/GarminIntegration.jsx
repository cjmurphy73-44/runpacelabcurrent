import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Watch } from "lucide-react";

export function GarminIntegration() {
  const handleConnect = () => {
    window.location.href = '/api/garmin/oauth/authorize';
  };

  return (
    <Card className="border border-border">
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Watch className="w-5 h-5 text-primary" />
          <div>
            <h3 className="text-sm font-medium">Garmin Connect</h3>
            <p className="text-xs text-muted-foreground">
              Direct Garmin sync for workouts, HRV, and daily health metrics.
            </p>
          </div>
        </div>
        <Button onClick={handleConnect} size="sm">
          Connect
        </Button>
      </CardContent>
    </Card>
  );
}

export default GarminIntegration;
