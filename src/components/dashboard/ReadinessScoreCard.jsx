import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useFitness } from "@/context/FitnessContext";

function classifyReadiness(biometricTelemetry) {
  const sorted = [...biometricTelemetry].sort((a, b) => b.date.localeCompare(a.date));
  const recent = sorted.slice(0, 3);
  if (recent.length === 0) return { label: "No Data", tone: "secondary" };

  const hrvValues = sorted.map((r) => r.hrv_ms).filter((v) => typeof v === "number");
  const baseline = hrvValues.length ? hrvValues.reduce((a, b) => a + b, 0) / hrvValues.length : null;
  const recentHrv = recent.map((r) => r.hrv_ms).filter((v) => typeof v === "number");
  const avgHrv = recentHrv.length ? recentHrv.reduce((a, b) => a + b, 0) / recentHrv.length : null;
  const recentSleep = recent.map((r) => r.sleep_duration_hours).filter((v) => typeof v === "number");
  const avgSleep = recentSleep.length ? recentSleep.reduce((a, b) => a + b, 0) / recentSleep.length : null;

  const hrvSuppressed = baseline && avgHrv !== null && avgHrv < baseline * 0.85;
  const hrvModerate = baseline && avgHrv !== null && avgHrv < baseline * 0.95;
  const sleepSuppressed = avgSleep !== null && avgSleep < 6;
  const sleepModerate = avgSleep !== null && avgSleep < 7;

  if (hrvSuppressed || sleepSuppressed) return { label: "Suppressed Readiness", tone: "destructive" };
  if (hrvModerate || sleepModerate) return { label: "Moderate Readiness", tone: "secondary" };
  return { label: "High Readiness", tone: "default" };
}

export default function ReadinessScoreCard() {
  const { biometricTelemetry } = useFitness();
  const result = useMemo(() => classifyReadiness(biometricTelemetry), [biometricTelemetry]);

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm font-heading">Biometric Readiness Score</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <Badge variant={result.tone}>{result.label}</Badge>
        <p className="text-xs text-muted-foreground">Based on the last 3 days of HRV and sleep duration vs. your rolling baseline.</p>
      </CardContent>
    </Card>
  );
}