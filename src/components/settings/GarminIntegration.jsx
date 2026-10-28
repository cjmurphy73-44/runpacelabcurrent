import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Watch } from "lucide-react";
import GarminConnectButton from "./GarminConnectButton";

export function GarminIntegration() {
  return (
    <Card className="border border-border">
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Watch className="w-5 h-5 text-primary" />
          <div>
            <h3 className="text-sm font-medium">Garmin Connect</h3>
            <p className="text-xs text-muted-foreground">Direct Garmin sync for workouts, HRV, and daily health metrics.</p>
          </div>
        </div>
        <GarminConnectButton />
      </CardContent>
    </Card>
  );
}

export default GarminIntegration;
