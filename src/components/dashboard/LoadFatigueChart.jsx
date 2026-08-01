import React, { useMemo } from "react";
import {
  ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Gauge, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { calculateHistoricalAndProjectedLoad, getTsbZoneInfo, toDateKey } from "@/lib/loadForecasting";

function MetricCard({ icon: Icon, label, value, suffix, badge }) {
  return (
    <div className="rounded-xl border border-border bg-card/70 backdrop-blur-md p-4 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
        <Icon className="w-3.5 h-3.5" /> {label}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-heading font-bold">{value}</span>
        {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
      </div>
      {badge && (
        <span className={`inline-block mt-2 text-xs font-medium px-2 py-0.5 rounded-full border ${badge.badgeClass}`}>
          {badge.label}
        </span>
      )}
    </div>
  );
}

export default function LoadFatigueChart({ completedSessions = [], plannedWorkouts = [] }) {
  const timeline = useMemo(
    () => calculateHistoricalAndProjectedLoad(completedSessions, plannedWorkouts, 7),
    [completedSessions, plannedWorkouts]
  );

  const todayKey = toDateKey(new Date());

  const chartData = useMemo(() => {
    const data = timeline.map((p) => ({
      ...p,
      ctlHistorical: !p.isProjected ? p.ctl : null,
      ctlProjected: p.isProjected ? p.ctl : null,
      atlHistorical: !p.isProjected ? p.atl : null,
      atlProjected: p.isProjected ? p.atl : null,
      tsbPositive: p.tsb > 0 ? p.tsb : 0,
      tsbNegative: p.tsb < 0 ? p.tsb : 0,
    }));
    // Bridge the solid→dashed transition so lines connect visually at "today"
    const lastHistoricalIdx = [...data].reverse().findIndex((p) => !p.isProjected);
    const idx = lastHistoricalIdx === -1 ? -1 : data.length - 1 - lastHistoricalIdx;
    if (idx !== -1 && data[idx + 1]) {
      data[idx].ctlProjected = data[idx].ctl;
      data[idx].atlProjected = data[idx].atl;
    }
    return data;
  }, [timeline]);

  if (timeline.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-sm font-heading">Load & Fatigue Forecast</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Log workouts to unlock your fitness/fatigue forecast.</p>
        </CardContent>
      </Card>
    );
  }

  const current = [...timeline].reverse().find((p) => !p.isProjected) || timeline[0];
  const projected = timeline[timeline.length - 1];
  const projectedZone = getTsbZoneInfo(projected.tsb);

  const projectedPoints = timeline.filter((p) => p.isProjected);
  const worstPoint = projectedPoints.reduce((min, p) => (!min || p.tsb < min.tsb ? p : min), null);
  const spikeDay = projectedPoints.reduce((max, p) => (!max || p.dailyTss > max.dailyTss ? p : max), null);
  const spikeWorkout = spikeDay ? plannedWorkouts.find((w) => w?.date && toDateKey(w.date) === spikeDay.date) : null;
  const overtrainingRisk = worstPoint && worstPoint.tsb < -25;

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm font-heading">Load & Fatigue Forecast</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard icon={TrendingUp} label="CTL (Fitness)" value={current.ctl} />
          <MetricCard icon={TrendingDown} label="ATL (Fatigue)" value={current.atl} />
          <MetricCard icon={Gauge} label="TSB (Form)" value={current.tsb} />
          <MetricCard
            icon={Gauge}
            label="7-Day Projected TSB"
            value={projected.tsb}
            badge={{ label: projectedZone.label, badgeClass: projectedZone.badgeClass }}
          />
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="tsbPositiveGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34d399" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#34d399" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="tsbNegativeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.02} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.4} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <ReferenceLine x={todayKey} stroke="#94a3b8" strokeDasharray="3 3" label={{ value: "Today", fontSize: 11, position: "top" }} />

              <Area type="monotone" dataKey="tsbPositive" stroke="none" fill="url(#tsbPositiveGradient)" isAnimationActive={false} />
              <Area type="monotone" dataKey="tsbNegative" stroke="none" fill="url(#tsbNegativeGradient)" isAnimationActive={false} />

              <Line type="monotone" dataKey="ctlHistorical" stroke="#38bdf8" strokeWidth={2} dot={false} name="CTL" connectNulls={false} />
              <Line type="monotone" dataKey="ctlProjected" stroke="#38bdf8" strokeWidth={2} strokeDasharray="5 5" dot={false} name="CTL (projected)" connectNulls={false} />
              <Line type="monotone" dataKey="atlHistorical" stroke="#fb7185" strokeWidth={2} dot={false} name="ATL" connectNulls={false} />
              <Line type="monotone" dataKey="atlProjected" stroke="#fb7185" strokeWidth={2} strokeDasharray="5 5" dot={false} name="ATL (projected)" connectNulls={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {overtrainingRisk && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-sm text-rose-700">
              <p className="font-medium">Overtraining risk in the next 7 days</p>
              <p>
                Form (TSB) is projected to drop to {worstPoint.tsb} by {worstPoint.date}
                {spikeDay && spikeDay.dailyTss > 0 && (
                  <>
                    , driven largely by {spikeWorkout?.rationale_text || spikeWorkout?.prescribed_intensity_zone || "a scheduled session"} on {spikeDay.date} (~{spikeDay.dailyTss} load).
                  </>
                )}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}