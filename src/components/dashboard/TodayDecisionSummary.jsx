import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { Activity, ArrowRight, HeartPulse, History, Scale } from "lucide-react";
import { useFitness } from "@/context/FitnessContext";
import { buildTodayDecision } from "@/lib/todayDecisionSummary";

/**
 * A three-part answer for the first screen on mobile:
 * recovery signals, load-related form, and the last recorded activity.
 * No new SDK calls or claims of medical clearance.
 */
export default function TodayDecisionSummary({ athlete, workouts = [] }) {
  const fitness = useFitness() || {};
  const decision = useMemo(() => buildTodayDecision({
    athlete, workouts, dailyMetrics: fitness.dailyMetrics,
  }), [athlete, workouts, fitness.dailyMetrics]);

  return (
    <section aria-labelledby="today-decision-heading" className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Your training today</p>
          <h2 id="today-decision-heading" className="font-heading text-xl font-semibold">What the data says</h2>
        </div>
        <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground w-fit">Not injury clearance</span>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <article className="rounded-lg border border-border bg-card p-4 min-w-0">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <HeartPulse aria-hidden="true" className="h-4 w-4" /> Recovery evidence
          </div>
          <h3 className="mt-2 text-lg font-semibold">{decision.readinessLabel}</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{decision.readinessDetail}</p>
        </article>
        <article className="rounded-lg border border-border bg-card p-4 min-w-0">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Scale aria-hidden="true" className="h-4 w-4" /> Training form
          </div>
          <h3 className="mt-2 text-lg font-semibold">Recent load balance</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{decision.formDetail}</p>
        </article>
        <article className="rounded-lg border border-border bg-card p-4 min-w-0">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <History aria-hidden="true" className="h-4 w-4" /> Latest activity
          </div>
          <h3 className="mt-2 text-lg font-semibold capitalize break-words">{decision.lastWorkout.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{decision.lastWorkout.detail}</p>
          {decision.lastWorkout.recorded && <p className="mt-2 text-xs text-muted-foreground">{decision.lastWorkout.loadEvidence}</p>}
        </article>
      </div>
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold"><Activity aria-hidden="true" className="h-4 w-4" /> {decision.guidance}</p>
          <p className="mt-1 text-xs text-muted-foreground">Follow any clinician or coach restrictions. A score cannot confirm that a foot injury is ready for running.</p>
        </div>
        <Link to="/plan" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
          Today's plan <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
