import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Info } from "lucide-react";
import HRZoneBreakdown from "@/components/workout/HRZoneBreakdown";
import { sessionZoneDistribution, formatZoneMethod } from "@/lib/workoutAnalytics";

// Time-in-zone panel. Zones are Karvonen (HR-reserve) based, so the boundaries shown
// belong to this athlete. The badge states whether the split is measured from device
// data (second-by-second stream or lap splits) or derived from a summary average heart
// rate, so a provider that only sends summaries is never presented as exact.
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
          Your zone floors — Z1 {bounds[0]}+ · Z2 {bounds[1]}+ · Z3 {bounds[2]}+ · Z4 {bounds[3]}+ · Z5 {bounds[4]}+ · max {bounds[5]} bpm
        </p>
      )}

      {!measured && method !== "none" && (
        <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
          <Info className="w-3 h-3 mt-0.5 shrink-0" />
          <span>
            This session arrived as a summary with only an average heart rate, so the split below
            is an estimate.{" "}
            <Link to="/import" className="text-primary hover:underline">
              Import the .fit or .tcx file
            </Link>{" "}
            to get exact per-second zone time.
          </span>
        </p>
      )}
    </div>
  );
}