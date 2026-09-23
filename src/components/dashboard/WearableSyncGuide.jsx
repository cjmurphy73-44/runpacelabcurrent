import React from "react";
import { Watch, Activity, CircleDot, Share2, Heart } from "lucide-react";
import { WEARABLES, syncGuideFor } from "@/lib/wearableCatalog";
import { Card, CardContent } from "@/components/ui/card";

const ICONS = { Watch, Activity, CircleDot, Share2, Heart };

function WearableIcon({ name, className = "" }) {
  const Ico = ICONS[name] ?? Watch;
  return <Ico className={className} />;
}

// Tailored sync guide shown after onboarding and on the dashboard empty state.
// Reads the athlete's selected wearable stack and renders provider-specific
// instructions so each user knows exactly how their data flows in.
export default function WearableSyncGuide({ selectedWearables = [], compact = false }) {
  const guide = syncGuideFor(selectedWearables);
  if (!guide.length) return null;

  if (compact) {
    return (
      <div className="space-y-2">
        {guide.map((g) => (
          <div key={g.key} className="flex gap-2.5 items-start">
            <span className={`text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded shrink-0 ${g.status === "manual_only" ? "bg-amber-500/15 text-amber-700" : "bg-primary/10 text-primary"}`}>
              {g.label}
            </span>
            <p className="text-xs text-muted-foreground leading-snug">{g.instructions}</p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <Card className="border-dashed">
      <CardContent className="pt-5 space-y-3">
        <div className="text-sm font-medium flex items-center gap-2">
          <Watch className="w-4 h-4 text-primary" />
          Your hardware stack — getting data in
        </div>
        <div className="space-y-3">
          {guide.map((g) => {
            const w = WEARABLES.find((x) => x.key === g.key);
            return (
              <div key={g.key} className="flex gap-3 items-start">
                <div className="shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <WearableIcon name={w?.icon} className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{g.label}</span>
                    <span className={`text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded ${g.status === "manual_only" ? "bg-amber-500/15 text-amber-700" : "bg-emerald-500/15 text-emerald-700"}`}>
                      {g.status === "manual_only" ? "Manual upload" : "Auto-sync"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-snug">{g.instructions}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}