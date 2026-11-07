import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, Gauge, HeartPulse } from "lucide-react";

function Metric({ icon: Icon, label, value }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <div className="text-base font-heading font-semibold tabular-nums">{value ?? "—"}</div>
    </div>
  );
}

// Shows the values derived from the effort the athlete just entered, so the
// estimate never appears out of nowhere, and states plainly that it is an
// estimate until a real race or threshold effort confirms it.
export default function BaselinePreviewCard({ derived, eff, showZones = true }) {
  if (!derived) return null;
  return (
    <Card className="bg-muted/40 border-dashed">
      <CardContent className="pt-5 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Activity className="w-4 h-4 text-primary" /> Estimated from what you entered
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Metric icon={Gauge} label="VDOT" value={eff("vdot")?.toFixed(1)} />
          <Metric icon={Activity} label="Threshold pace" value={eff("thresholdPaceFormatted")} />
          <Metric icon={HeartPulse} label="Max HR" value={eff("maxHr") ? `${eff("maxHr")} bpm` : null} />
          <Metric icon={HeartPulse} label="LTHR" value={eff("lactateThresholdHr") ? `${eff("lactateThresholdHr")} bpm` : null} />
        </div>
        {showZones && derived.hrZones && (
          <div className="text-xs text-muted-foreground font-mono tabular-nums leading-relaxed">
            HR zones (Z1→Z5):{" "}
            {["zone1", "zone2", "zone3", "zone4", "zone5"]
              .map((z) => `${derived.hrZones[z].minBpm}–${derived.hrZones[z].maxBpm}`)
              .join(" / ")}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          An estimate, not a measurement. Log a race or a threshold run and we'll lock it in.
        </p>
      </CardContent>
    </Card>
  );
}