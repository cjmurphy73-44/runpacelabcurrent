import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import WorkoutDetailModal from "@/components/workout/WorkoutDetailModal";
import { workoutLoadPresentation } from "@/lib/workoutLoadPresentation";

export default function RecentWorkouts({ workouts = [], athlete, onChanged }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm font-heading">Recent workouts</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {workouts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No workouts logged yet.</p>
        ) : (
          workouts.map((w) => (
            <WorkoutDetailModal key={w.id} workout={w} athlete={athlete} onChanged={onChanged}>
              <button type="button" aria-label={`View ${w.sport || "workout"} details for ${w.date || "unknown date"}`} className="w-full min-w-0 flex items-center justify-between gap-3 border-b border-border py-3 last:border-0 text-left cursor-pointer hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md px-2 -mx-1 transition-colors">
                <div>
                  <p className="text-sm font-medium">{w.date} · <Badge variant="secondary" className="capitalize">{w.sport}</Badge></p>
                  <p className="text-xs text-muted-foreground">
                    {w.duration_minutes ? `${w.duration_minutes} min` : ""} {w.distance_km ? `· ${w.distance_km} km` : ""} {w.avg_hr ? `· ${w.avg_hr} bpm avg` : ""}
                  </p>
                </div>
                <div className="min-w-0 shrink-0 text-right">
                  <p className="text-sm font-heading font-semibold">{workoutLoadPresentation(w).amount}</p>
                  <p className="text-[11px] text-muted-foreground">{workoutLoadPresentation(w).label}</p>
                </div>
              </div>
            </WorkoutDetailModal>
          ))
        )}
      </CardContent>
    </Card>
  );
}