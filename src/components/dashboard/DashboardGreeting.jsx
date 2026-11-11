import React from "react";
import { Link } from "react-router-dom";
import { Activity, ArrowUpRight, Gauge, Waves } from "lucide-react";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

// Keep zero distinct from missing. The athlete profile may contain default
// zeroes before load has been calculated, so never label these as "live".
function formatLoad(value, signed = false) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  const rounded = Math.round(value);
  return signed && rounded > 0 ? `+${rounded}` : String(rounded);
}

export default function DashboardGreeting({ athlete }) {
  const name = athlete?.first_name;
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long", day: "numeric", month: "long",
  });

  const metrics = [
    {
      label: "Fitness",
      value: formatLoad(athlete?.current_ctl),
      description: "Longer-term load",
      icon: Activity,
    },
    {
      label: "Fatigue",
      value: formatLoad(athlete?.current_atl),
      description: "Shorter-term load",
      icon: Waves,
    },
    {
      label: "Form",
      value: formatLoad(athlete?.current_tsb, true),
      description: "Fitness minus fatigue",
      icon: Gauge,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <p className="text-xs text-muted-foreground">{today}</p>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight">
            {greeting()}{name ? `, ${name}` : ""}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your training at a glance.
          </p>
        </div>
        <Link
          to="/physiology"
          className="inline-flex min-h-11 items-center gap-1 self-start sm:self-auto text-sm font-medium text-primary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Explore physiology <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      <section aria-label="Training load snapshot" className="rounded-xl border border-border bg-card p-3 sm:p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-heading font-semibold">Training load snapshot</h2>
          <span className="text-[11px] text-muted-foreground">Stored estimates</span>
        </div>
        <dl className="grid grid-cols-1 min-[360px]:grid-cols-3 gap-2 sm:gap-3">
          {metrics.map(({ label, value, description, icon: Icon }) => (
            <div key={label} className="min-w-0 rounded-lg border border-border bg-muted/30 p-3 sm:p-4">
              <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Icon className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                {label}
              </dt>
              <dd className="mt-2 font-heading text-2xl sm:text-3xl font-semibold tabular-nums text-foreground">
                {value}
              </dd>
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{description}</p>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-muted-foreground">
          Estimates from your athlete profile, not live measurements. Zero may be a default until your training history is processed.
        </p>
      </section>
    </div>
  );
}
