import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFitness } from "@/context/FitnessContext";
import PerformanceChart from "@/components/dashboard/PerformanceChart";

export default function FitnessStats({ athlete }) {
  const { dailyMetrics, loading, visibleRange } = useFitness();
  const history = dailyMetrics.slice(-visibleRange);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Fitness (CTL)</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-heading font-bold">{Math.round(athlete.current_ctl || 0)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Fatigue (ATL)</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-heading font-bold">{Math.round(athlete.current_atl || 0)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Form (TSB)</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-heading font-bold">{Math.round(athlete.current_tsb || 0)}</p></CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-sm font-heading">{visibleRange}-day trend</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data yet — upload a workout to start tracking.</p>
          ) : (
            <PerformanceChart data={history} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}