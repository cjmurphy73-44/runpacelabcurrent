import React, { useMemo } from "react";
import { Activity, Zap, Gauge, Target } from "lucide-react";
import { calculateHistoricalAndProjectedLoad } from "@/lib/loadForecasting";

// Pro-athlete metric banner. Uses the SAME computed CTL/ATL/TSB model as the hero
// PMC chart (calculateHistoricalAndProjectedLoad from workouts) rather than the
// stored profile values, so the banner always matches the chart and never shows
// stale/NaN figures. Styled to flow with the light dashboard: standard card
// surface, an accent top-stripe per metric, and monospace numerics.
export default function DashboardMetricBanner({ athlete, workouts = [] }) {
  const { ctl, atl, tsb } = useMemo(() => {
    const timeline = calculateHistoricalAndProjectedLoad(workouts, [], 0);
    if (timeline.length === 0) return { ctl: 0, atl: 0, tsb: 0 };
    const current = [...timeline].reverse().find((p) => !p.isProjected) || timeline[timeline.length - 1];
    return { ctl: current.ctl, atl: current.atl, tsb: current.tsb };
  }, [workouts]);

  const weeklyTss = useMemo(() => {
    const cutoff = Date.now() - 7 * 86400000;
    return (workouts || [])
      .filter((w) => w?.date && Date.parse(w.date) >= cutoff)
      .reduce((s, w) => s + (w.session_trimp || w.session_tss || 0), 0);
  }, [workouts]);
  const weeklyGoal = Math.round(Math.max(ctl, 0) * 7);

  const accentBar = { blue: "bg-blue-500", pink: "bg-pink-500", emerald: "bg-emerald-500", rose: "bg-rose-500", amber: "bg-amber-500" };
  const accentText = { blue: "text-blue-600", pink: "text-pink-600", emerald: "text-emerald-600", rose: "text-rose-600", amber: "text-amber-600" };
  const tsbAccent = tsb >= 0 ? "emerald" : "rose";

  const cards = [
    { label: "CTL · Fitness", value: Math.round(ctl), icon: Activity, accent: "blue" },
    { label: "ATL · Fatigue", value: Math.round(atl), icon: Zap, accent: "pink" },
    { label: "TSB · Form", value: Math.round(tsb), icon: Gauge, accent: tsbAccent },
    { label: "Wk TSS · Goal", value: `${Math.round(weeklyTss)} / ${weeklyGoal}`, icon: Target, accent: "amber" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => (
        <div key={c.label} className="relative rounded-xl border border-border bg-card p-4 pt-5 shadow-sm overflow-hidden">
          <div className={`absolute top-0 left-0 right-0 h-1 ${accentBar[c.accent]}`} />
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <c.icon className="w-3.5 h-3.5" /> {c.label}
          </div>
          <div className={`mt-2 text-3xl font-mono font-bold ${accentText[c.accent]}`}>{c.value}</div>
        </div>
      ))}
    </div>
  );
}