import React, { useMemo } from "react";
import { Activity, Zap, Gauge, Target } from "lucide-react";
import { calculateHistoricalAndProjectedLoad } from "@/lib/loadForecasting";

// Pro-athlete metric banner. Uses the SAME computed CTL/ATL/TSB model as the hero
// PMC chart (calculateHistoricalAndProjectedLoad from workouts) rather than the
// stored profile values, so the banner always matches the chart and never shows
// stale/NaN figures. Quantum Polar styling: hairline cards, tabular-mono numerics,
// uppercase tracked labels, and a thin goal bar.
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
  const goalPct = weeklyGoal > 0 ? Math.max(0, Math.min(100, Math.round((weeklyTss / weeklyGoal) * 100))) : 0;

  const cards = [
    { label: "CTL · Fitness", value: Math.round(ctl), icon: Activity },
    { label: "ATL · Fatigue", value: Math.round(atl), icon: Zap },
    { label: "TSB · Form", value: Math.round(tsb), icon: Gauge, tone: tsb >= 0 ? "pos" : "neg" },
    { label: "Wk TSS · Goal", value: `${Math.round(weeklyTss)} / ${weeklyGoal}`, icon: Target, bar: goalPct },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="rounded-md border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            <c.icon className="w-3.5 h-3.5" /> {c.label}
          </div>
          <div
            className={`mt-2 text-3xl font-mono tabular-nums font-bold tracking-tight ${
              c.tone === "pos" ? "text-accent-emerald" : c.tone === "neg" ? "text-destructive" : "text-foreground"
            }`}
          >
            {c.value}
          </div>
          {typeof c.bar === "number" && (
            <div className="mt-3 h-1 w-full rounded-full bg-secondary">
              <div className="h-1 rounded-full bg-primary" style={{ width: `${c.bar}%` }} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}