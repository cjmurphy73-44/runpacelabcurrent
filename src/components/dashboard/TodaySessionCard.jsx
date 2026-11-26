import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ZoneBadge from "@/components/ui/ZoneBadge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useFitness } from "@/context/FitnessContext";
import { CalendarDays, Moon, AlertTriangle } from "lucide-react";
import moment from "moment";
import { useCoachInjurySignal } from "@/hooks/useCoachInjurySignal";
import CoachHoldCard from "@/components/dashboard/CoachHoldCard";
import TodayFocusLine from "@/components/dashboard/TodayFocusLine";

const SESSION_STATUS = {
  completed: "Completed",
  partial: "Partially completed",
  excess: "Completed above plan",
  skipped: "Skipped",
};

function detectAnomaly(biometricTelemetry) {
  const sorted = [...(biometricTelemetry || [])].sort((a, b) => b.date.localeCompare(a.date));
  const hrvValues = sorted.map((r) => r.hrv_ms).filter((v) => typeof v === "number");
  if (hrvValues.length < 4) return false;
  const baseline = hrvValues.slice(1).reduce((a, b) => a + b, 0) / hrvValues.slice(1).length;
  return hrvValues[0] < baseline * 0.85;
}

export default function TodaySessionCard({ athlete, schedule }) {
  const { biometricTelemetry } = useFitness() || {};
  const injury = useCoachInjurySignal(athlete.id);
  const today = moment().format("YYYY-MM-DD");
  const todaysSessions = schedule?.sessions.filter(item => item.date === today) ?? [];
  const session = todaysSessions.find(item => !SESSION_STATUS[item.status]) ?? todaysSessions[0];
  const plan = schedule?.plan;
  const workoutId = session && schedule?.workoutBySession[session.id];
  const status = SESSION_STATUS[session?.status];

  const anomaly = detectAnomaly(biometricTelemetry);
  const isRunning = session?.sport?.toLowerCase() === "running";
  // Pace zones in the plan are running-derived, so only apply them to running sessions.
  const paceZone = isRunning ? plan?.pace_zones?.find((z) => z.zone === session?.prescribed_intensity_zone) : null;
  const hrvAdvice = plan?.hrv_framework?.find((f) => /hrv|suppress|low/i.test(f.condition || ""));
  // A coach hold pauses running: the run day is replaced by the hold card, which shows
  // why it is on, lets the athlete read the coach's own words and clear it in one tap.
  const runOnHold = injury.level === "hold" && isRunning && !status;

  return (
    <Card className="h-full border-border shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-heading">Today's session</CardTitle>
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

        {!schedule ? (
          <p role="status" className="text-sm text-muted-foreground">Could not load today’s session.</p>
        ) : !plan ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <CalendarDays className="h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">No active training plan yet.</p>
            </div>
            <Button asChild variant="outline" size="sm" className="min-h-11"><Link to="/plan">Open training plans</Link></Button>
          </div>
        ) : session && !runOnHold ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-2xl font-heading font-bold capitalize">{session.sport}</h3>
              <ZoneBadge zone={session.prescribed_intensity_zone} />
              {status && <span className="text-sm font-medium text-muted-foreground">{status}</span>}
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
            {workoutId && <Link to={`/workouts/${workoutId}`} className="inline-flex min-h-11 items-center text-sm font-medium hover:underline">Review completed workout</Link>}
            {!status && !injury.loading && !injury.unavailable && injury.level === "none" && !anomaly && (
              <TodayFocusLine athlete={athlete} today={today} />
            )}
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

        {anomaly && (
          <Alert variant="destructive">
            <AlertTriangle className="w-4 h-4" />
            <AlertTitle>Recovery Alert</AlertTitle>
            <AlertDescription>
              {hrvAdvice?.action || "Your HRV is notably below baseline, consider easing today's intensity or swapping to recovery."}
            </AlertDescription>
          </Alert>
        )}

        {todaysSessions.length > 1 && (
          <Link to="/calendar" className="inline-flex min-h-11 items-center text-sm font-medium hover:underline">View all {todaysSessions.length} sessions in Calendar</Link>
        )}
      </CardContent>
    </Card>
  );
}
