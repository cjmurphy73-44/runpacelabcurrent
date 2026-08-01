import React, { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import HRZoneBreakdown from "@/components/workout/HRZoneBreakdown";
import WorkoutMetricTile from "@/components/workout/WorkoutMetricTile";
import { computeHrZoneDistribution, estimateCalories, normalizedPacePower } from "@/lib/workoutAnalytics";

export default function WorkoutDetailModal({ workout, athlete, children }) {
  const maxHr = athlete?.max_heart_rate || workout.max_hr;
  const zones = useMemo(() => computeHrZoneDistribution(workout, maxHr), [workout, maxHr]);
  const calories = useMemo(() => estimateCalories(workout, athlete), [workout, athlete]);
  const pacePower = normalizedPacePower(workout);

  const aerobicPct = Math.round((zones[0]?.pct || 0) + (zones[1]?.pct || 0) + (zones[2]?.pct || 0));
  const anaerobicPct = Math.max(100 - aerobicPct, 0);
  const durationMin = Math.round(workout.duration_minutes || (workout.duration_seconds || 0) / 60);

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-lg bg-card/95 border border-border/50 backdrop-blur">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {workout.date} <Badge variant="secondary" className="capitalize">{workout.sport}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <WorkoutMetricTile label="Total Time" value={durationMin ? `${durationMin} min` : "—"} />
          <WorkoutMetricTile label="Distance" value={workout.distance_km ? `${workout.distance_km.toFixed(2)} km` : "—"} />
          <WorkoutMetricTile label="TRIMP / Load" value={Math.round(workout.session_trimp || workout.session_tss || 0)} />
          <WorkoutMetricTile label="Avg HR" value={workout.avg_hr ? `${workout.avg_hr} bpm` : "—"} />
          <WorkoutMetricTile label="Max HR" value={workout.max_hr ? `${workout.max_hr} bpm` : "—"} />
          <WorkoutMetricTile label="Norm. Pace/Power" value={pacePower} />
          <WorkoutMetricTile label="Calories" value={calories ? `${calories} kcal` : "—"} />
          <WorkoutMetricTile label="Efficiency Factor" value={workout.efficiency_factor ? workout.efficiency_factor.toFixed(2) : "—"} />
        </div>

        <div className="pt-2">
          <h4 className="text-xs font-semibold text-muted-foreground mb-2">HR Zone Distribution</h4>
          <HRZoneBreakdown zones={zones} />
        </div>

        <div className="pt-2 border-t border-border/50">
          <h4 className="text-xs font-semibold text-muted-foreground mb-2">Training Effect</h4>
          <div className="flex gap-3">
            <div className="flex-1 rounded-lg bg-emerald-500/10 p-2 text-center">
              <p className="text-lg font-bold text-emerald-400">{aerobicPct}%</p>
              <p className="text-xs text-muted-foreground">Aerobic</p>
            </div>
            <div className="flex-1 rounded-lg bg-rose-500/10 p-2 text-center">
              <p className="text-lg font-bold text-rose-400">{anaerobicPct}%</p>
              <p className="text-xs text-muted-foreground">Anaerobic</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}