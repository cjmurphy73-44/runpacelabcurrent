import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

// Session-level impact on the fitness curve, read straight from the stored EWMA
// daily values: this training day's CTL/ATL/TSB versus the previous day with data.
// No new maths — the numbers stay exactly what recalculateCTLATLTSB produced.
function Delta({ value, suffix = "" }) {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  const rounded = Math.round(value * 10) / 10;
  const Icon = rounded > 0.5 ? TrendingUp : rounded < -0.5 ? TrendingDown : Minus;
  const tone = rounded > 0.5 ? "text-emerald-400" : rounded < -0.5 ? "text-rose-400" : "text-muted-foreground";
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-mono ${tone}`}>
      <Icon className="w-3 h-3" />
      {rounded > 0 ? "+" : ""}{rounded}{suffix}
    </span>
  );
}

function Tile({ label, value, delta, hint }) {
  return (
    <div className="rounded-lg border border-border/60 bg-secondary/40 p-2.5">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-mono text-lg font-semibold leading-tight">
        {value === null || value === undefined ? "—" : Math.round(value * 10) / 10}
      </p>
      <div className="flex items-center justify-between gap-2">
        <Delta value={delta} />
        {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
      </div>
    </div>
  );
}

export default function WorkoutFitnessImpact({ workout, athleteId }) {
  const [state, setState] = useState({ loading: true, current: null, previous: null });

  useEffect(() => {
    if (!athleteId || !workout?.date) return;
    let cancelled = false;
    (async () => {
      try {
        // 30-day window ending at the session date: enough to find the previous
        // training day without a second round-trip.
        const rows = await base44.entities.DailyMetrics.filter(
          { athlete_id: athleteId, date: { $lte: workout.date } },
          "-date",
          30
        );
        const list = Array.isArray(rows) ? rows : rows?.items || [];
        const current = list.find((r) => r.date === workout.date) || null;
        const previous = list.find((r) => r.date < workout.date) || null;
        if (!cancelled) setState({ loading: false, current, previous });
      } catch {
        if (!cancelled) setState({ loading: false, current: null, previous: null });
      }
    })();
    return () => { cancelled = true; };
  }, [athleteId, workout?.date]);

  const { loading, current, previous } = state;
  if (loading) {
    return <div className="h-20 rounded-lg border border-border/60 bg-secondary/30 animate-pulse" />;
  }
  if (!current) {
    return (
      <p className="text-[11px] text-muted-foreground">
        Fitness curve not calculated for this day yet — it updates once the day's load is reconciled.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-muted-foreground">Impact on your fitness curve</h4>
        <span className="text-[10px] text-muted-foreground">this training day vs. previous</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Tile label="Fitness · CTL" value={current.calculated_ctl} delta={current.calculated_ctl != null && previous?.calculated_ctl != null ? current.calculated_ctl - previous.calculated_ctl : null} />
        <Tile label="Fatigue · ATL" value={current.calculated_atl} delta={current.calculated_atl != null && previous?.calculated_atl != null ? current.calculated_atl - previous.calculated_atl : null} />
        <Tile label="Form · TSB" value={current.calculated_tsb} delta={null} hint="CTL − ATL" />
      </div>
    </div>
  );
}