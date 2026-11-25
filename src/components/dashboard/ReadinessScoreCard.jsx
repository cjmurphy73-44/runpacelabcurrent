import React, { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useFitness } from "@/context/FitnessContext";
import RecoverySourceBadge from "@/components/dashboard/RecoverySourceBadge";
import { base44 } from "@/api/base44Client";
import { TrendingUp, TrendingDown, Minus, ShieldCheck } from "lucide-react";

// Aligned with the server-authoritative thresholds (85 / 70 / 50).
function classify(score) {
  if (score == null) return { label: "No data yet", tone: "secondary" };
  if (score >= 85) return { label: "Optimal readiness", tone: "default" };
  if (score >= 70) return { label: "Good readiness", tone: "default" };
  if (score >= 50) return { label: "Moderate readiness", tone: "secondary" };
  return { label: "High fatigue", tone: "destructive" };
}

export default function ReadinessScoreCard() {
  const { dailyMetrics } = useFitness();
  const [serverReadiness, setServerReadiness] = useState(null);
  const [loadFailed, setLoadFailed] = useState(false);

  const today = useMemo(() => {
    const sorted = [...dailyMetrics].sort((a, b) => b.date.localeCompare(a.date));
    return sorted[0] || null;
  }, [dailyMetrics]);

  useEffect(() => {
    let cancelled = false;
    setServerReadiness(null);
    setLoadFailed(false);
    base44.functions.invoke("physiologyCompute", {})
      .then((res) => {
        if (cancelled) return;
        const data = res?.data ?? res;
        if (data?.readiness) setServerReadiness(data.readiness);
        else setLoadFailed(true);
      })
      .catch(() => { if (!cancelled) setLoadFailed(true); });
    return () => { cancelled = true; };
  }, [today?.id, today?.updated_date]);

  const serverResponded = serverReadiness != null;
  const score = serverReadiness?.score ?? null;
  const serverSignalCount = serverReadiness?.signal_count ?? null;

  const providerScore = today?.provider_readiness_score ?? null;
  const providerSource = today?.provider_readiness_source ?? today?.recovery_source ?? null;
  const delta = (score != null && providerScore != null) ? score - providerScore : null;
  const cls = classify(score);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-heading flex items-center justify-between">
          <span>Readiness</span>
          <div className="flex items-center gap-1.5">
            {serverResponded && <ShieldCheck className="w-3 h-3 text-primary" title="Server-computed" />}
            {today?.recovery_source && <RecoverySourceBadge source={today.recovery_source} />}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {score == null ? (
          <div className="space-y-2">
            <Badge variant="secondary">{loadFailed ? "Readiness unavailable" : serverResponded ? "Recovery data needed" : "Loading readiness"}</Badge>
            {serverResponded && (
              <p className="text-xs text-muted-foreground">Add recovery measurements to see readiness. Workout history still shows your training load and form.</p>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold font-heading">{score}</span>
              <span className="text-xs text-muted-foreground">/ 100 holistic</span>
            </div>
            <Badge variant={cls.tone}>{cls.label}</Badge>

            {serverSignalCount != null && serverSignalCount > 0 && (
              <p className="text-[11px] text-muted-foreground">
                Based on {serverSignalCount} signal{serverSignalCount === 1 ? "" : "s"}{serverReadiness?.has_baseline ? " with rolling baseline" : ", no baseline yet"}.
              </p>
            )}

            {providerScore != null && (
              <div className="pt-2 border-t border-border space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    {providerSource && <RecoverySourceBadge source={providerSource} />}
                    <span>{providerSource === "manual" ? "reported score" : "device score"}</span>
                  </span>
                  <span className="font-medium">{providerScore}</span>
                </div>
                {delta != null && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">vs. holistic</span>
                    <span className={`font-medium flex items-center gap-1 ${delta > 2 ? "text-success" : delta < -2 ? "text-destructive" : "text-muted-foreground"}`}>
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
