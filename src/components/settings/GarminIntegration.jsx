import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Watch } from "lucide-react";

export function GarminIntegration() {
  return (
    <Card className="border border-border">
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Watch className="w-5 h-5 text-muted-foreground" />
          <div>
            <h3 className="text-sm font-medium">Garmin Connect</h3>
            <p className="text-xs text-muted-foreground">
              Direct API integration coming soon. Upload .FIT files in Imports today.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" disabled>
          Coming Soon
        </Button>
      </CardContent>
    </Card>
  );
}

export default GarminIntegration;
