import React from "react";
import { Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import WipBadge from "@/components/common/WipBadge";

// Direct Strava OAuth/webhook sync is not production-ready yet (Strava API
// approval + webhook subscription wiring is still in progress). This card is
// intentionally a non-interactive "Coming Soon" surface so users don't hit dead
// buttons — manual .fit upload via the Import page is the working path today,
// or automatic sync via a connected COROS watch.
export default function StravaIntegration({ athleteId }) {
  return (
    <div className="flex flex-col gap-2 p-3 border border-border rounded-md">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="bg-muted p-2 rounded text-muted-foreground shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium flex items-center gap-2">
              Strava
              <WipBadge label="Coming Soon" />
            </p>
            <p className="text-xs text-muted-foreground">Direct Strava sync is in development.</p>
          </div>
        </div>
        <Button
          size="sm"
          disabled
          title="Direct Strava sync is coming soon — export .fit files for now."
        >
          <Activity className="w-4 h-4 mr-1" /> Connect
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Today:</span> export
        <span className="font-medium"> .fit</span> files from Strava
        (Activity → ⋯ → Export original) and upload them on the Import page —
        or connect a COROS watch for automatic sync right now.
      </p>
    </div>
  );
}