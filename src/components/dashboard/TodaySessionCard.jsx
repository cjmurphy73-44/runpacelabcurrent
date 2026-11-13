import React, { useCallback, useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ZoneBadge from "@/components/ui/ZoneBadge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useFitness } from "@/context/FitnessContext";
import { CheckCircle2, Moon, AlertTriangle, RefreshCw } from "lucide-react";
import moment from "moment";
import { useCoachInjurySignal } from "@/hooks/useCoachInjurySignal";
import CoachHoldCard from "@/components/dashboard/CoachHoldCard";
import { Button } from "@/components/ui/button";

function detectAnomaly(biometricTelemetry) {
  const sorted = [...(biometricTelemetry || [])].sort((a, b) => b.date.localeCompare(a.date));
  const hrvValues = sorted.map((r) => r.hrv_ms).filter((v) => typeof v === "number");
  if (hrvValues.length < 4) return false;
  const baseline = hrvValues.slice(1).reduce((a, b) => a + b, 0) / hrvValues.slice(1).length;
  return hrvValues[0] < baseline * 0.85;
}

export default function TodaySessionCard({ athleteId }) {
  const { biometricTelemetry } = useFitness() || {};
  const injury = useCoachInjurySignal(athleteId);
  const [session, setSession] = useState(undefined);
  const [plan, setPlan] = useState(null);

  const [loadError, setLoadError] = useState(false);
  const requestId = useRef(0);

  const loadSession = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setSession(undefined);
    setPlan(null);
    setLoadError(false);
    if (!athleteId) {
      setLoadError(true);
      return;
    }
    try {
      const todayStr = moment().format("YYYY-MM-DD");
      const [sessions, plans] = await Promise.all([
        base44.entities.TrainingPlanSession.filter({ athlete_id: athleteId, date: todayStr }),
        base44.entities.TrainingPlan.filter({ athlete_id: athleteId, status: "active" }, "-created_date", 1),
      ]);
      if (requestId.current !== currentRequest) return;
      setSession(sessions?.[0] || null);
      setPlan(plans?.[0] || null);
    } catch {
      if (requestId.current !== currentRequest) return;
      setLoadError(true);
      setSession(null);
    }
  }, [athleteId]);

  useEffect(() => {
    loadSession();
    return () => { requestId.current += 1; };
  }, [loadSession]);

  const anomaly = detectAnomaly(biometricTelemetry);
  const isRunning = session?.sport?.toLowerCase() === "running";
  // Pace zones in the plan are running-derived, so only apply them to running sessions.
  const paceZone = isRunning ? plan?.pace_zones?.find((z) => z.zone === session?.prescribed_intensity_zone) : null;
  const hrvAdvice = plan?.hrv_framework?.find((f) => /hrv|suppress|low/i.test(f.condition || ""));
  // A coach hold pauses running: the run day is replaced by the hold card, which shows
  // why it is on, lets the athlete read the coach's own words and clear it in one tap.
  const runOnHold = injury.level === "hold" && isRunning;

  return (
    <Card className="h-full border-border shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground font-heading uppercase tracking-wide">Today's Session</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <CoachHoldCard
          injury={injury}
          hideWhenNone
          swappedLabel={
            runOnHold
              ? `Today's ${session?.prescribed_duration_minutes ?? ""} min ${session?.prescribed_intensity_zone || ""} run is swapped to rest or very easy cross-training.`
              : "No running today. Keep it to rest or very easy cross-training until you're cleared."
          }
        />

        {loadError ? (
          <div role="alert" className="space-y-3 rounded-md border border-border p-3">
            <p className="text-sm font-medium">Today's session could not be loaded</p>
            <p className="text-xs text-muted-foreground">Your training plan is unchanged. Check your connection and try again.</p>
            <Button variant="outline" size="sm" className="min-h-[44px] gap-2" onClick={loadSession}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" /> Retry session
            </Button>
          </div>
        ) : session === undefined ? (
          <p className="text-sm text-muted-foreground" role="status">Loading today's session…</p>
        ) : session && !runOnHold ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-2xl font-heading font-bold capitalize">{session.sport}</h3>
              <ZoneBadge zone={session.prescribed_intensity_zone} />
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Duration</p>
                <p className="font-medium">{session.prescribed_duration_minutes} min</p>
              </div>
              {paceZone?.pace_range && (
                <div>
                  <p className="text-muted-foreground text-xs">Target Pace</p>
                  <p className="font-medium">{paceZone.pace_range}</p>
                </div>
              )}
              {paceZone?.hr_range && (
                <div>
                  <p className="text-muted-foreground text-xs">Target HR</p>
                  <p className="font-medium">{paceZone.hr_range}</p>
                </div>
              )}
              {session.target_power != null && !isRunning && (
                <div>
                  <p className="text-muted-foreground text-xs">Target Power</p>
                  <p className="font-medium">{session.target_power} W</p>
                </div>
              )}
            </div>
            {session.rationale_text && <p className="text-sm text-muted-foreground">{session.rationale_text}</p>}
          </div>
        ) : !session ? (
          <div className="flex items-center gap-3 py-2">
            <Moon className="w-8 h-8 text-primary" />
            <div>
              <p className="font-heading font-bold text-lg">Rest Day</p>
              <p className="text-sm text-muted-foreground">No session scheduled, focus on recovery.</p>
            </div>
          </div>
        ) : null}

        {!loadError && anomaly && (
          <Alert variant="destructive">
            <AlertTriangle className="w-4 h-4" />
            <AlertTitle>Recovery Alert</AlertTitle>
            <AlertDescription>
              {hrvAdvice?.action || "Your HRV is notably below baseline, consider easing today's intensity or swapping to recovery."}
            </AlertDescription>
          </Alert>
        )}

        {!loadError && !anomaly && session && !runOnHold && (
          <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span>No low-HRV alert detected from available readings. This does not confirm recovery or clearance to train; consider your symptoms and current coach guidance.</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}