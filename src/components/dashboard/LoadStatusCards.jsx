import React, { useMemo } from "react";
import { calculateTrainingLoads } from "@/lib/physiologyEngine";
import { useTimeRange } from "@/hooks/useTimeRange";
import { COLORS } from "@/constants/colors";

export default function LoadStatusCards({ workouts }) {
  const { timeRange } = useTimeRange();
  const loads = useMemo(() => {
    if (!workouts || workouts.length === 0) return null;
    return calculateTrainingLoads(workouts, timeRange);
  }, [workouts, timeRange]);

  if (!loads) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg bg-card">
      <div className="flex flex-col">
        <span className="text-sm text-muted-foreground">CTL (Fitness)</span>
        <span className="text-2xl font-bold" style={{ color: COLORS.CTL }}>{Math.round(loads.ctl)}</span>
      </div>
      <div className="flex flex-col">
        <span className="text-sm text-muted-foreground">ATL (Fatigue)</span>
        <span className="text-2xl font-bold" style={{ color: COLORS.ATL }}>{Math.round(loads.atl)}</span>
      </div>
      <div className="flex flex-col">
        <span className="text-sm text-muted-foreground">TSB (Form)</span>
        <span className="text-2xl font-bold" style={{ color: loads.tsb >= 0 ? COLORS.TSB_FRESH : COLORS.TSB_FATIGUED }}>
          {Math.round(loads.tsb)}
        </span>
      </div>
    </div>
  );
}
