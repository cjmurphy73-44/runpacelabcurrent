import React from "react";
import { Activity, Gauge } from "lucide-react";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function DashboardGreeting({ athlete }) {
  const name = athlete?.first_name;
  const tsb = athlete?.current_tsb;
  const ctl = athlete?.current_ctl;
  const today = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="relative flex min-w-0 flex-col gap-5 overflow-hidden rounded-2xl border border-border/70 bg-card px-5 py-6 shadow-sm sm:flex-row sm:items-end sm:justify-between sm:px-7 sm:py-7">
      <div className="relative z-10 min-w-0">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{today}</p>
        <h1 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight">
          {greeting()}{name ? `, ${name}` : ""}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Your training, in focus.</p>
      </div>
      {(ctl != null || tsb != null) && (
        <div className="relative z-10 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-border/70 pt-4 text-sm sm:border-t-0 sm:pt-0">
          {ctl != null && !isNaN(ctl) && (
            <div className="flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground">Fitness</span>
              <span className="font-mono font-semibold tabular-nums">{Math.round(ctl)}</span>
            </div>
          )}
          {tsb != null && !isNaN(tsb) && (
            <div className="flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground">Form</span>
              <span className={`font-mono font-semibold tabular-nums ${tsb >= 0 ? "text-success" : "text-warning"}`}>
                {tsb >= 0 ? "+" : ""}{Math.round(tsb)}
              </span>
            </div>
          )}
        </div>
      )}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/45 to-transparent" />
    </div>
  );
}