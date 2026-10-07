import React, { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useFitness } from "@/context/FitnessContext";
import RecoverySourceBadge from "@/components/dashboard/RecoverySourceBadge";
import { computeHolisticReadiness } from "@/science/readiness";
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
  const { biometricTelemetry, dailyMetrics } = useFitness();
  const [serverReadiness, setServerReadiness] = useState(null);

  const today = useMemo(() => {
    const sorted = [...dailyMetrics].sort((a, b) => b.date.localeCompare(a.date));
    return sorted[0] || null;
  }, [dailyMetrics]);

  // Instant local computation — displayed immediately while the server-authoritative
  // score loads. Kept as a fallback so the card never goes blank.
  const localHolistic = useMemo(() => {
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

  // S6: fetch the server-authoritative readiness score (proprietary formula runs
  // behind the backend function, not shipped to the browser). Prefers the server
  // result when available; the local value renders instantly in the meantime.
  useEffect(() => {
    let cancelled = false;
    base44.functions.invoke("physiologyCompute", {})
      .then((res) => {
        if (cancelled) return;
        const data = res?.data ?? res;
        if (data?.readiness) setServerReadiness(data.readiness);
      })
      .catch(() => { /* keep local fallback */ });
    return () => { cancelled = true; };
  }, [today?.id]);

  // Server verdict is authoritative once it arrives — including a null score
  // meaning "Insufficient Data", which overrides any stale stored value so
  // the card never shows a contradictory number after the server says no data.
  // Before the server responds, the local computation is the instant fallback.
  const serverResponded = serverReadiness != null;
  const score = serverResponded
    ? (serverReadiness.score ?? null)
    : (localHolistic?.score ?? today?.readiness_score ?? null);
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
            <Badge variant="secondary">No data yet</Badge>
            <p className="text-xs text-muted-foreground">
              Connect Garmin or COROS to auto-ingest overnight HRV, sleep, and resting HR — or log today's metrics manually.
            </p>
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
                Based on {serverSignalCount} signal{serverSignalCount === 1 ? "" : "s"}{serverReadiness?.has_baseline ? " with rolling baseline" : " — no baseline yet"}.
              </p>
            )}

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