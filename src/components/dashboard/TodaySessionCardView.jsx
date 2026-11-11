import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ZoneBadge from "@/components/ui/ZoneBadge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { ArrowRight, AlertCircle, Moon, AlertTriangle, ShieldAlert, BedDouble, RefreshCw, Activity } from "lucide-react";

function detectAnomaly(biometricTelemetry) {
  const sorted = [...(biometricTelemetry || [])].sort((a, b) => b.date.localeCompare(a.date));
  const hrvValues = sorted.map((r) => r.hrv_ms).filter((v) => typeof v === "number");
  if (hrvValues.length < 4) return false;
  const baseline = hrvValues.slice(1).reduce((a, b) => a + b, 0) / hrvValues.slice(1).length;
  return hrvValues[0] < baseline * 0.85;
}

export function TodaySessionCardView({ session, plan, loadError = false, onRetry = () => {}, biometricTelemetry = [], injury = { level: "none", loading: false, evidence: [] } }) {
  const anomaly = detectAnomaly(biometricTelemetry);
  const hasHrvHistory = (biometricTelemetry || []).filter((row) => Number.isFinite(row.hrv_ms)).length >= 4;
  const isRunning = session?.sport?.toLowerCase() === "running";
  // Pace zones in the plan are running-derived, so only apply them to running sessions.
  const paceZone = isRunning ? plan?.pace_zones?.find((z) => z.zone === session?.prescribed_intensity_zone) : null;
  const hrvAdvice = plan?.hrv_framework?.find((f) => /hrv|suppress|low/i.test(f.condition || ""));

  return (
    <Card className="h-full border-border shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm text-muted-foreground font-heading uppercase tracking-wide">Today's Session</CardTitle>
          <Button asChild variant="ghost" size="sm" className="min-h-9 text-primary">
            <Link to="/plan">Training plan <ArrowRight aria-hidden="true" /></Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loadError ? (
          <div role="alert" className="space-y-3 rounded-lg border border-border bg-muted/40 p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
              <div>
                <p className="font-heading font-semibold">Session temporarily unavailable</p>
                <p className="text-sm text-muted-foreground">We couldn't load your training plan. Your schedule hasn't been changed.</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RefreshCw aria-hidden="true" /> Retry loading
            </Button>
          </div>
        ) : session === undefined ? (
          <div role="status" className="space-y-3" aria-label="Loading today's session">
            <div className="h-6 w-36 animate-pulse rounded bg-muted" />
            <div className="h-4 w-52 max-w-full animate-pulse rounded bg-muted" />
          </div>
        ) : session ? (
          injury.level === "hold" && session.sport?.toLowerCase().startsWith("run") ? (
            <div className="space-y-3">
              <Alert variant="destructive">
                <ShieldAlert className="w-4 h-4" />
                <AlertTitle>Coach hold, running paused</AlertTitle>
                <AlertDescription className="space-y-1">
                  <p>{injury.summary}</p>
                  {injury.evidence[0]?.snippet && (
                    <p className="italic text-xs">“{injury.evidence[0].snippet}”</p>
                  )}
                </AlertDescription>
              </Alert>
              <div className="flex items-center gap-3 py-1">
                <BedDouble className="w-8 h-8 text-primary" />
                <div>
                  <p className="font-heading font-bold text-lg">Recovery Day (Coach Hold)</p>
                  <p className="text-sm text-muted-foreground">Rest or swap to cross-train (bike / pool) at very easy effort. Resume running once the coach clears you.</p>
                </div>
              </div>
              <div className="text-xs text-muted-foreground line-through opacity-60">
                Was: {session.sport} · {session.prescribed_duration_minutes} min · {session.prescribed_intensity_zone || "—"}
              </div>
            </div>
          ) : (
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
          )
        ) : plan ? (
          <div className="flex items-center gap-3 py-2">
            <Moon className="w-8 h-8 shrink-0 text-primary" aria-hidden="true" />
            <div>
              <p className="font-heading font-bold text-lg">No workout scheduled</p>
              <p className="text-sm text-muted-foreground">Your active plan has no session today. Check your training plan or prioritise recovery.</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 py-2">
            <Activity className="w-8 h-8 shrink-0 text-primary" aria-hidden="true" />
            <div>
              <p className="font-heading font-bold text-lg">No active training plan</p>
              <p className="text-sm text-muted-foreground">Open your training plan to schedule your next session.</p>
            </div>
          </div>
        )}

        {!loadError && session !== undefined && anomaly && (
          <Alert variant="destructive">
            <AlertTriangle className="w-4 h-4" />
            <AlertTitle>Recovery Alert</AlertTitle>
            <AlertDescription>
              {hrvAdvice?.action || "Your HRV is notably below baseline, consider easing today's intensity or swapping to recovery."}
            </AlertDescription>
          </Alert>
        )}

        {!loadError && session && !anomaly && !injury.loading && !(injury.level === "hold" && session.sport?.toLowerCase().startsWith("run")) && (
          <p className="text-xs text-muted-foreground">
            {hasHrvHistory
              ? "No low-HRV alert detected. Check how you feel before training."
              : "HRV readiness not assessed — add recovery data for more context."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

