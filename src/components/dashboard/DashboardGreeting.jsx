import React from "react";
import { Activity, Gauge } from "lucide-react";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function formContext(tsb) {
  if (tsb == null || isNaN(tsb)) return null;
  if (tsb >= 5) return "You're fresh — a great day for a quality session.";
  if (tsb <= -10) return "You're carrying fatigue — consider an easy day or rest.";
  return "You're in a balanced range — train to plan.";
}

export default function DashboardGreeting({ athlete }) {
  const name = athlete?.first_name;
  const tsb = athlete?.current_tsb;
  const ctl = athlete?.current_ctl;
  const today = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
  const ctx = formContext(tsb);

  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
      <div>
        <p className="text-xs text-muted-foreground">{today}</p>
        <h1 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight">
          {greeting()}{name ? `, ${name}` : ""}
        </h1>
        {ctx && <p className="text-sm text-muted-foreground mt-1">{ctx}</p>}
      </div>
      {(ctl != null || tsb != null) && (
        <div className="flex items-center gap-5 text-sm">
          {ctl != null && !isNaN(ctl) && (
            <div className="flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground">Fitness</span>
              <span className="font-semibold tabular-nums">{Math.round(ctl)}</span>
            </div>
          )}
          {tsb != null && !isNaN(tsb) && (
            <div className="flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground">Form</span>
              <span className={`font-semibold tabular-nums ${tsb >= 0 ? "text-emerald-600" : "text-amber-600"}`}>
                {tsb >= 0 ? "+" : ""}{Math.round(tsb)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}