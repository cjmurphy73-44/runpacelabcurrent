import React, { useMemo } from "react";
import { calculateTrainingLoads } from "@/lib/physiologyEngine";

export default function LoadStatusCards({ workouts }) {
  const loads = useMemo(() => {
    if (!workouts || workouts.length === 0) return null;
    return calculateTrainingLoads(workouts);
  }, [workouts]);

  if (!loads) return null;

  const getStatusColor = (val) => {
    if (val > 20) return "text-red-500";
    if (val > 5) return "text-orange-500";
    return "text-green-500";
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg bg-card">
      <div className="flex flex-col">
        <span className="text-sm text-muted-foreground">CTL (Fitness)</span>
        <span className="text-2xl font-bold">{Math.round(loads.ctl)}</span>
      </div>
      <div className="flex flex-col">
        <span className="text-sm text-muted-foreground">ATL (Fatigue)</span>
        <span className="text-2xl font-bold">{Math.round(loads.atl)}</span>
      </div>
      <div className="flex flex-col">
        <span className="text-sm text-muted-foreground">TSB (Form)</span>
        <span className={`text-2xl font-bold ${getStatusColor(loads.tsb)}`}>
          {Math.round(loads.tsb)}
        </span>
      </div>
    </div>
  );
}
