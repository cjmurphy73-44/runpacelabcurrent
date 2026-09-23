import React from "react";
import { Watch } from "lucide-react";
import { Button } from "@/components/ui/button";
import WipBadge from "@/components/common/WipBadge";

// Garmin Connect direct OAuth/sync is not production-ready yet (the Garmin Partner
// API approval path was deprioritized). This card is intentionally a non-interactive
// "Coming Soon" surface so users don't hit dead buttons — manual .fit upload via the
// dashboard bulk importer is the working path for Garmin users today.
export default function GarminIntegration({ athleteId }) {
  return (
    <div className="flex flex-col gap-2 p-3 border border-border rounded-md">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="bg-muted p-2 rounded text-muted-foreground shrink-0">
            <Watch className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium flex items-center gap-2">
              Garmin Connect
              <WipBadge label="Coming Soon" />
            </p>
            <p className="text-xs text-muted-foreground">Direct Garmin sync is in development.</p>
          </div>
        </div>
        <Button
          size="sm"
          disabled
          title="Garmin direct sync is coming soon — use manual .fit upload for now."
        >
          <Watch className="w-4 h-4 mr-1" /> Connect
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Today:</span> export{" "}
        <span className="font-medium">.fit</span> files from Garmin Connect
        (Activity → ⋯ → Export Original) and drop them into the dashboard bulk importer —
        they ingest just like COROS exports.
      </p>
    </div>
  );
}