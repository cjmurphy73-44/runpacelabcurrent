import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { workoutLoadPresentation } from "@/lib/workoutLoadPresentation";

export default function RecentWorkouts({ workouts }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm font-heading">Recent workouts</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {workouts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No workouts logged yet.</p>
        ) : (
          workouts.map((w) => (
            <Link key={w.id} to={`/workouts/${w.id}`} className="flex items-center justify-between gap-2 border-b border-border py-2 last:border-0 hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring rounded-md px-1 -mx-1 transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{w.date} · <Badge variant="secondary" className="capitalize">{w.sport}</Badge></p>
                  <p className="text-xs text-muted-foreground">
                    {w.duration_minutes ? `${w.duration_minutes} min` : ""} {w.distance_km ? `· ${w.distance_km} km` : ""} {w.avg_hr ? `· ${w.avg_hr} bpm avg` : ""}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-heading font-semibold">{workoutLoadPresentation(w).amount}</p>
                  <p className="text-[11px] text-muted-foreground">{workoutLoadPresentation(w).label}</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}
