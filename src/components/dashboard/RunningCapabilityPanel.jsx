import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { Activity, ArrowRight, Bike, Footprints, Gauge, Info } from "lucide-react";
import { paceTextFromSpeed, runningCapabilitySnapshot } from "@/lib/runningCapabilitySnapshot";

/**
 * Athlete-facing explanation of historical running metrics after interruptions.
 * No VDOT writes, threshold edits, injury diagnosis or auto-created training.
 */
export default function RunningCapabilityPanel({ athlete, workouts = [] }) {
  const snapshot = useMemo(() => runningCapabilitySnapshot(workouts), [workouts]);
  const historicalPace = paceTextFromSpeed(athlete?.functional_threshold_pace_ms);
  const hasHistorical = historicalPace || (Number.isFinite(athlete?.vdot_estimate) && athlete.vdot_estimate > 0);
  return (
    <section aria-labelledby="running-capability-heading" className="rounded-xl border border-border bg-card p-4 sm:p-6 space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start">
        <div className="space-y-1">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><Activity className="h-4 w-4" /> Running capability</p>
          <h2 id="running-capability-heading" className="font-heading text-xl sm:text-2xl font-semibold">{snapshot.title}</h2>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Your last known running performance is a reference, not a promise about today's threshold.
            Cycling supports fitness but does not confirm your running pace.
          </p>
        </div>
        <span className="w-fit rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">Current pace unverified</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg bg-muted/60 p-3">
          <p className="text-xs text-muted-foreground">Previous threshold</p>
          <p className="mt-1 font-mono text-xl font-semibold tabular-nums">{historicalPace || "—"}</p>
          <p className="text-xs text-muted-foreground">Historical reference</p>
        </div>
        <div className="rounded-lg bg-muted/60 p-3">
          <p className="text-xs text-muted-foreground">Previous VDOT</p>
          <p className="mt-1 font-mono text-xl font-semibold tabular-nums">{Number.isFinite(athlete?.vdot_estimate) && athlete.vdot_estimate > 0 ? Math.round(athlete.vdot_estimate) : "—"}</p>
          <p className="text-xs text-muted-foreground">Not current verified fitness</p>
        </div>
        <div className="rounded-lg bg-muted/60 p-3">
          <p className="flex items-center gap-1 text-xs text-muted-foreground"><Footprints className="h-3.5 w-3.5" /> Runs · 42 days</p>
          <p className="mt-1 font-mono text-xl font-semibold tabular-nums">{snapshot.runs42}</p>
          <p className="text-xs text-muted-foreground">Recorded sessions</p>
        </div>
        <div className="rounded-lg bg-muted/60 p-3">
          <p className="flex items-center gap-1 text-xs text-muted-foreground"><Bike className="h-3.5 w-3.5" /> Rides · 42 days</p>
          <p className="mt-1 font-mono text-xl font-semibold tabular-nums">{snapshot.rides42}</p>
          <p className="text-xs text-muted-foreground">Counted separately</p>
        </div>
      </div>
      <div className="flex items-start gap-2 text-sm text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>{snapshot.truncated
          ? "Only a limited activity window is available here. A running break cannot be confirmed from this list."
          : snapshot.status === "running_break"
            ? `Last recorded run was ${snapshot.lastRunDays} days ago. The old threshold may no longer reflect current running ability.`
            : snapshot.status === "returning"
              ? "Recent runs show you are getting back into running. Easy comeback sessions are not threshold tests."
              : snapshot.status === "active_unverified"
                ? "Running frequency is visible, but no verified race or threshold test has established a new threshold."
                : "There is not enough verified running performance evidence to estimate a new threshold."}
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <Link to="/vdot" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
          <Gauge className="h-4 w-4" /> Explore race-based paces <ArrowRight className="h-4 w-4" />
        </Link>
        <Link to="/plan" className="inline-flex min-h-11 items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted">
          Review training plan
        </Link>
      </div>
      {hasHistorical && <p className="text-xs text-muted-foreground">Historical values are preserved. Neither this panel nor a recent easy run changes your stored VDOT or threshold.</p>}
    </section>
  );
}
