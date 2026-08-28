import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFitness } from "@/context/FitnessContext";
import PerformanceChart from "@/components/dashboard/PerformanceChart";

export default function FitnessStats({ athlete }) {
  const { dailyMetrics, loading, visibleRange } = useFitness();
  const history = dailyMetrics.slice(-visibleRange);

  return (
    <div className="space-y-4">
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