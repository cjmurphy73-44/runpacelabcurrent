import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import WorkoutDetailModal from "@/components/workout/WorkoutDetailModal";

export default function RecentWorkouts({ workouts, athlete, onChanged }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm font-heading">Recent workouts</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {workouts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No workouts logged yet.</p>
        ) : (
          workouts.map((w) => (
            <WorkoutDetailModal key={w.id} workout={w} athlete={athlete} onChanged={onChanged}>
              <div className="flex items-center justify-between border-b border-border py-2 last:border-0 cursor-pointer hover:bg-accent/50 rounded-md px-1 -mx-1 transition-colors">
                <div>
                  <p className="text-sm font-medium">{w.date} · <Badge variant="secondary" className="capitalize">{w.sport}</Badge></p>
                  <p className="text-xs text-muted-foreground">
                    {w.duration_minutes ? `${w.duration_minutes} min` : ""} {w.distance_km ? `· ${w.distance_km} km` : ""} {w.avg_hr ? `· ${w.avg_hr} bpm avg` : ""}
                  </p>
                </div>
                <p className="text-sm font-heading font-semibold">{Math.round(w.session_trimp || 0)} TRIMP</p>
              </div>
            </WorkoutDetailModal>
          ))
        )}
      </CardContent>
    </Card>
  );
}