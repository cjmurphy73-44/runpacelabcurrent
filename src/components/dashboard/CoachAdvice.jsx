import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useFitness } from "@/context/FitnessContext";
import { computePhenotypeInsights } from "@/lib/athletePhenotyping";

const SEVERITY_VARIANTS = {
  positive: "default",
  warning: "secondary",
  danger: "destructive",
};

export default function CoachAdvice() {
  const { dailyMetrics, biometricTelemetry } = useFitness();
  const insights = useMemo(() => computePhenotypeInsights(dailyMetrics, biometricTelemetry), [dailyMetrics, biometricTelemetry]);

  return (
    <Card className="h-full">
      <CardHeader><CardTitle className="text-sm font-heading">Coach Advice — Phenotyping Engine</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {insights.length === 0 ? (
          <p className="text-sm text-muted-foreground">Not enough multi-variate trend data yet to generate deep insights — keep logging biometrics and holistic factors to unlock cross-metric analysis.</p>
        ) : (
          insights.map((insight, idx) => (
            <div key={idx} className="space-y-1 border-b border-border last:border-0 pb-3 last:pb-0">
              <Badge variant={SEVERITY_VARIANTS[insight.severity] || "secondary"}>{insight.title}</Badge>
              <p className="text-sm text-muted-foreground">{insight.narrative}</p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}