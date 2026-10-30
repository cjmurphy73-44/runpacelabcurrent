import React, { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Info } from "lucide-react";
import HRZoneBreakdown from "@/components/workout/HRZoneBreakdown";
import { sessionZoneDistribution, formatZoneMethod } from "@/lib/workoutAnalytics";

// Time-in-zone panel. Zones are Karvonen (HR-reserve) based, so the boundaries shown
// belong to this athlete; the method badge states whether the distribution is measured
// (stream/laps) or estimated from average HR, rather than implying precision we lack.
export default function WorkoutZonePanel({ workout, athlete }) {
  const { zones, method, bounds } = useMemo(
    () => sessionZoneDistribution(workout, athlete),
    [workout, athlete]
  );

  const measured = method === "stream" || method === "laps";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h4 className="text-xs font-semibold text-muted-foreground">Time in zone</h4>
        <Badge variant={measured ? "secondary" : "outline"} className="text-[10px] font-normal">
          {formatZoneMethod(method)}
        </Badge>
      </div>

      <HRZoneBreakdown zones={zones} />

      {bounds && bounds.length === 6 && (
        <p className="text-[11px] text-muted-foreground font-mono">
          HR reserve {bounds[0]}–{bounds[1]} · {bounds[1]}–{bounds[2]} · {bounds[2]}–{bounds[3]} · {bounds[3]}–{bounds[4]} · {bounds[4]}+ bpm
        </p>
      )}

      {!measured && method !== "none" && (
        <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
          <Info className="w-3 h-3 mt-0.5 shrink-0" />
          No second-by-second data for this session, so the split is estimated from average heart rate. Import a .fit or .tcx with streams for exact zone time.
        </p>
      )}
    </div>
  );
}