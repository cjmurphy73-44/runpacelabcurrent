import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useFitness } from "@/context/FitnessContext";
import RecoverySourceBadge from "@/components/dashboard/RecoverySourceBadge";
import { computeHolisticReadiness } from "@/science/readiness";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

function classify(score) {
  if (score == null) return { label: "No data yet", tone: "secondary" };
  if (score >= 75) return { label: "High readiness", tone: "default" };
  if (score >= 55) return { label: "Moderate readiness", tone: "secondary" };
  return { label: "Suppressed readiness", tone: "destructive" };
}

export default function ReadinessScoreCard() {
  const { biometricTelemetry, dailyMetrics } = useFitness();

  const today = useMemo(() => {
    const sorted = [...dailyMetrics].sort((a, b) => b.date.localeCompare(a.date));
    return sorted[0] || null;
  }, [dailyMetrics]);

  // Recompute the holistic score live from the latest readings + rolling baseline, so the card
  // reflects the same engine the backend uses during ingest (keeps client/server in sync).
  const holistic = useMemo(() => {
    if (!today) return null;
    const hrvBase = biometricTelemetry
      .map((r) => r.hrv_ms).filter((v) => typeof v === "number" && v > 0);
    const rhrBase = biometricTelemetry
      .map((r) => r.resting_hr).filter((v) => typeof v === "number" && v > 0);
    const sleepBase = biometricTelemetry
      .map((r) => r.sleep_score).filter((v) => typeof v === "number" && v > 0);
    return computeHolisticReadiness(
      {
        hrv: today.hrv,
        sleep_score: today.sleep_score,
        sleep_duration_hours: today.sleep_duration_hours,
        resting_hr: today.resting_hr,
        body_battery: today.body_battery,
        stress_score: today.stress_score,
        tsb: today.calculated_tsb,
      },
      {
        hrv: hrvBase.length ? hrvBase.reduce((a, b) => a + b, 0) / hrvBase.length : null,
        resting_hr: rhrBase.length ? rhrBase.reduce((a, b) => a + b, 0) / rhrBase.length : null,
        sleep_score: sleepBase.length ? sleepBase.reduce((a, b) => a + b, 0) / sleepBase.length : null,
      }
    );
  }, [today, biometricTelemetry]);

  const providerScore = today?.provider_readiness_score ?? null;
  const providerSource = today?.provider_readiness_source ?? today?.recovery_source ?? null;
  const delta = (holistic != null && providerScore != null) ? holistic.score - providerScore : null;
  const cls = classify(holistic != null ? holistic.score : (today?.readiness_score ?? null));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-heading flex items-center justify-between">
          <span>Readiness</span>
          {today?.recovery_source && <RecoverySourceBadge source={today.recovery_source} />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {holistic == null && !today?.readiness_score ? (
          <div className="space-y-2">
            <Badge variant="secondary">No data yet</Badge>
            <p className="text-xs text-muted-foreground">
              Connect Garmin or COROS to auto-ingest overnight HRV, sleep, and resting HR — or log today's metrics manually.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold font-heading">{holistic != null ? holistic.score : today?.readiness_score}</span>
              <span className="text-xs text-muted-foreground">/ 100 holistic</span>
            </div>
            <Badge variant={cls.tone}>{cls.label}</Badge>

            {providerScore != null && (
              <div className="pt-2 border-t border-border space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    {providerSource && <RecoverySourceBadge source={providerSource} />}
                    <span>device score</span>
                  </span>
                  <span className="font-medium">{providerScore}</span>
                </div>
                {delta != null && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">vs. holistic</span>
                    <span className={`font-medium flex items-center gap-1 ${delta > 2 ? "text-emerald-600" : delta < -2 ? "text-destructive" : "text-muted-foreground"}`}>
                      {delta > 2 ? <TrendingUp className="w-3 h-3" /> : delta < -2 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                      {delta > 0 ? "+" : ""}{delta}
                    </span>
                  </div>
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground pt-1">
              Holistic score blends HRV, sleep, resting HR, and current form against your rolling baseline.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}