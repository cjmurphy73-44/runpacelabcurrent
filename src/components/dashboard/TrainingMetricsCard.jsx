import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { calculateCTL, calculateATL, calculateTSB } from "@/utils/physiologyEngine";
import { TrendingUp, BatteryCharging, AlertCircle } from "lucide-react";

export default function TrainingMetricsCard({ workouts = [] }) {
  const metrics = useMemo(() => {
    // Assuming workouts have a { tss, date } structure
    const sortedWorkouts = [...workouts].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    const ctl = calculateCTL(sortedWorkouts);
    const atl = calculateATL(sortedWorkouts);
    const tsb = calculateTSB(ctl, atl);

    return { ctl, atl, tsb };
  }, [workouts]);

  const getTsbColor = (tsb) => {
    if (tsb > 5) return "text-green-600";
    if (tsb > -10) return "text-blue-600";
    return "text-red-600";
  };

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
