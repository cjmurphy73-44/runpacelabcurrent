import React, { useMemo } from "react";
import { Activity, Zap, Gauge, Target } from "lucide-react";

// Pro-Athlete Obsidian top metric banner — high-contrast stat cards on the dark
// obsidian surface, monospace numerics, accent-colored per metric.
export default function DashboardMetricBanner({ athlete, workouts }) {
  const ctl = Number(athlete?.current_ctl) || 0;
  const atl = Number(athlete?.current_atl) || 0;
  const tsb = Number(athlete?.current_tsb) || 0;

  const weeklyTss = useMemo(() => {
    const cutoff = Date.now() - 7 * 86400000;
    return (workouts || [])
      .filter((w) => w?.date && Date.parse(w.date) >= cutoff)
      .reduce((s, w) => s + (w.session_trimp || w.session_tss || 0), 0);
  }, [workouts]);
  const weeklyGoal = Math.round(Math.max(ctl, 0) * 7);

  const cards = [
    { label: "CTL · Fitness", value: Math.round(ctl), icon: Activity, accent: "text-accent-blue", ring: "border-accent-blue/40" },
    { label: "ATL · Fatigue", value: Math.round(atl), icon: Zap, accent: "text-accent-pink", ring: "border-accent-pink/40" },
    { label: "TSB · Form", value: Math.round(tsb), icon: Gauge, accent: tsb >= 0 ? "text-accent-emerald" : "text-destructive", ring: "border-accent-emerald/40" },
    { label: "Wk TSS · Goal", value: `${Math.round(weeklyTss)} / ${weeklyGoal}`, icon: Target, accent: "text-accent-amber", ring: "border-accent-amber/40" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className={`rounded-xl border ${c.ring} bg-obsidian-base p-4 shadow-sm`}
        >
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <c.icon className="w-3.5 h-3.5" /> {c.label}
          </div>
          <div className={`mt-2 text-3xl font-mono font-bold ${c.accent}`}>{c.value}</div>
        </div>
      ))}
    </div>
  );
}