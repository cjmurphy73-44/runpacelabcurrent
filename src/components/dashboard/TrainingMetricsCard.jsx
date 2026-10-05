import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { calculateCTL, calculateATL, calculateTSB } from "@/utils/physiologyEngine";
import { TrendingUp } from "lucide-react";

export default function TrainingMetricsCard({ workouts = [] }) {
  const metrics = useMemo(() => {
    if (!workouts || workouts.length === 0) {
      return { ctl: 0, atl: 0, tsb: 0 };
    }

    const sortedWorkouts = [...workouts].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    let currentCTL = 0;
    let currentATL = 0;

    sortedWorkouts.forEach(workout => {
      currentCTL = calculateCTL(currentCTL, workout.tss || 0);
      currentATL = calculateATL(currentATL, workout.tss || 0);
    });

    const tsb = calculateTSB(currentCTL, currentATL);

    return { ctl: currentCTL, atl: currentATL, tsb };
  }, [workouts]);

  const getTsbColor = (tsb) => {
    if (tsb > 5) return "text-green-600";
    if (tsb > -10) return "text-blue-600";
    return "text-red-600";
  };

  if (!workouts || workouts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" /> Training Metrics
          </CardTitle>
          <CardDescription>No workout data available to calculate trends.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Upload your first workout to see your CTL, ATL, and TSB.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" /> Training Metrics
        </CardTitle>
        <CardDescription>Chronic Load, Acute Load & Fatigue Balance</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">CTL</p>
          <p className="text-2xl font-bold">{Math.round(metrics.ctl)}</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">ATL</p>
          <p className="text-2xl font-bold">{Math.round(metrics.atl)}</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">TSB</p>
          <p className={`text-2xl font-bold ${getTsbColor(metrics.tsb)}`}>
            {Math.round(metrics.tsb)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}