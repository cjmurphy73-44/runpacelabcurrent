import React, { useMemo, useState } from "react";
import { ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { useFitness } from "@/context/FitnessContext";
import { format } from "date-fns";

const TIMEFRAMES = [
  { label: "1M", days: 30 },
  { label: "3M", days: 90 },
  { label: "6M", days: 180 },
  { label: "1Y", days: 365 },
];

function getTrainingStatus(tsb) {
  if (tsb <= -30) return { label: "High Overreaching Risk", color: "text-danger" };
  if (tsb <= -10) return { label: "Optimal Training Zone", color: "text-success" };
  if (tsb <= 5) return { label: "Neutral / Maintaining", color: "text-muted-foreground" };
  if (tsb <= 25) return { label: "Fresh / Race Ready", color: "text-primary" };
  return { label: "Detraining Risk", color: "text-warning" };
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0]?.payload || {};
  const status = getTrainingStatus(row.calculated_tsb || 0);

  return (
    <div className="rounded-lg border border-border/50 bg-card/95 backdrop-blur p-3 shadow-xl text-xs space-y-1">
      <div className="font-medium text-foreground">{label ? format(new Date(label), "MMM d, yyyy") : ""}</div>
      <div className="flex justify-between gap-4">
        <span className="text-success">CTL (Fitness)</span>
        <span className="text-foreground font-mono font-medium tabular-nums">{Math.round(row.calculated_ctl || 0)}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-danger">ATL (Fatigue)</span>
        <span className="text-foreground font-mono font-medium tabular-nums">{Math.round(row.calculated_atl || 0)}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-muted-foreground">TSB (Form)</span>
        <span className="text-foreground font-mono font-medium tabular-nums">{Math.round(row.calculated_tsb || 0)}</span>
      </div>
      <div className={`pt-1 border-t border-border/50 font-semibold ${status.color}`}>{status.label}</div>
    </div>
  );
}

export default function PerformanceChart() {
  const { dailyMetrics, loading } = useFitness();
  const [timeframeDays, setTimeframeDays] = useState(90);

  const data = useMemo(() => {
    if (!dailyMetrics || dailyMetrics.length === 0) return [];
    return dailyMetrics.slice(-timeframeDays);
  }, [dailyMetrics, timeframeDays]);

  const { maxTsb, minTsb, zeroOffset } = useMemo(() => {
    const values = data.map((d) => d.calculated_tsb || 0);
    const max = Math.max(5, ...values);
    const min = Math.min(-5, ...values);
    const offset = max / (max - min || 1);
    return { maxTsb: max, minTsb: min, zeroOffset: Math.min(Math.max(offset, 0), 1) };
  }, [data]);

  if (loading) {
    return (
      <div className="bg-card/40 border border-border/50 backdrop-blur rounded-xl p-4 h-[340px] animate-pulse" />
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-card/40 border border-border/50 backdrop-blur rounded-xl p-4 flex items-center justify-center h-[340px] text-sm text-muted-foreground">
        Not enough data yet to chart CTL / ATL / TSB.
      </div>
    );
  }

  return (
    <div className="bg-card/40 border border-border/50 backdrop-blur rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-semibold text-sm text-foreground">Fitness, Fatigue &amp; Form</h3>
        <div className="flex gap-1">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.label}
              onClick={() => setTimeframeDays(tf.days)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                timeframeDays === tf.days
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent"
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} margin={{ top: 5, right: 8, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="tsbGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset={0} stopColor="hsl(var(--primary))" stopOpacity={0.5} />
              <stop offset={zeroOffset} stopColor="hsl(var(--primary))" stopOpacity={0.15} />
              <stop offset={zeroOffset} stopColor="hsl(var(--warning))" stopOpacity={0.15} />
              <stop offset={1} stopColor="hsl(var(--warning))" stopOpacity={0.5} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickFormatter={(d) => format(new Date(d), "MMM d")}
            axisLine={{ stroke: "hsl(var(--border))" }}
          />
          <YAxis yAxisId="load" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={{ stroke: "hsl(var(--border))" }} />
          <YAxis
            yAxisId="tsb"
            orientation="right"
            domain={[minTsb, maxTsb]}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            axisLine={{ stroke: "hsl(var(--border))" }}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* TSB target zone shading */}
          <ReferenceLine yAxisId="tsb" y={-10} stroke="hsl(var(--success))" strokeDasharray="3 3" strokeOpacity={0.6} />
          <ReferenceLine yAxisId="tsb" y={-30} stroke="hsl(var(--danger))" strokeDasharray="3 3" strokeOpacity={0.6} />
          <ReferenceLine yAxisId="tsb" y={5} stroke="hsl(var(--primary))" strokeDasharray="3 3" strokeOpacity={0.6} />
          <ReferenceLine yAxisId="tsb" y={25} stroke="hsl(var(--warning))" strokeDasharray="3 3" strokeOpacity={0.6} />
          <ReferenceLine yAxisId="tsb" y={0} stroke="hsl(var(--border))" strokeWidth={1} />

          <Area
            yAxisId="tsb"
            type="monotone"
            dataKey="calculated_tsb"
            name="TSB (Form)"
            stroke="none"
            fill="url(#tsbGradient)"
          />
          <Line
            yAxisId="load"
            type="monotone"
            dataKey="calculated_ctl"
            name="CTL (Fitness)"
            stroke="hsl(var(--success))"
            strokeWidth={2.5}
            dot={false}
          />
          <Line
            yAxisId="load"
            type="monotone"
            dataKey="calculated_atl"
            name="ATL (Fatigue)"
            stroke="hsl(var(--danger))"
            strokeWidth={1.75}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-1">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-success" /> CTL (Fitness)</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-danger" /> ATL (Fatigue)</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-primary" /> TSB Fresh</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-warning" /> TSB Fatigued</span>
      </div>
    </div>
  );
}