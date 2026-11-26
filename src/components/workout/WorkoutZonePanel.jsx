import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Info } from "lucide-react";
import HRZoneBreakdown from "@/components/workout/HRZoneBreakdown";
import { sessionZoneDistribution, recordedZoneDistribution, formatZoneMethod } from "@/lib/workoutAnalytics";

// Time-in-zone panel. Zones are Karvonen (HR-reserve) based, so the boundaries shown
// belong to this athlete. A distribution is drawn only when the session carries a
// genuine second-by-second stream: an activity summary with just an average heart
// rate gets no bars at all, because a split invented from one number is not data.
export default function WorkoutZonePanel({ workout, athlete, originalAnalysis, showImport = true }) {
  const { zones, method, bounds } = useMemo(
    () => originalAnalysis
      ? (recordedZoneDistribution(originalAnalysis) ?? { method: "none" })
      : sessionZoneDistribution(workout, athlete),
    [workout, athlete, originalAnalysis]
  );

  if (method === "none") {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h4 className="text-xs font-semibold text-muted-foreground">Time in zone</h4>
          <Badge variant="outline" className="text-[10px] font-normal">
            {originalAnalysis ? "Insufficient heart-rate coverage" : "Recording unavailable"}
          </Badge>
        </div>
        <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
          <Info className="w-3 h-3 mt-0.5 shrink-0" />
          <span>
            {originalAnalysis
              ? "The original file has too few heart-rate samples for zone analysis."
              : "The saved samples do not cover enough of this session for zone analysis."}
            {showImport && !originalAnalysis && (
              <>{" "}<Link to="/import#workout-files" className="text-primary hover:underline">
                Import the .fit or .tcx file
              </Link>{" "}if you have the original recording.</>
            )}
          </span>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h4 className="text-xs font-semibold text-muted-foreground">Time in zone</h4>
        <Badge variant="secondary" className="text-[10px] font-normal">
          {formatZoneMethod(method)}
        </Badge>
      </div>

      <HRZoneBreakdown zones={zones} />

      {bounds && bounds.length === 6 && (
        <p className="text-[11px] text-muted-foreground font-mono">
          Your zone floors, Z1 {bounds[0]}+ · Z2 {bounds[1]}+ · Z3 {bounds[2]}+ · Z4 {bounds[3]}+ · Z5 {bounds[4]}+ · max {bounds[5]} bpm
        </p>
      )}
    </div>
  );
}
