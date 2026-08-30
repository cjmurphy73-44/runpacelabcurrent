import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from "recharts";
import { Loader2, TrendingUp, BarChart3 } from "lucide-react";

const WINDOWS = [
  { label: "3 months", months: 3 },
  { label: "6 months", months: 6 },
  { label: "12 months", months: 12 },
];

function isoWeekLabel(dateStr) {
  const d = new Date(dateStr + "T00:00:00Z");
  const day = d.getUTCDay() || 7;
  const thursday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day + 4));
  const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((thursday.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${String(thursday.getUTCFullYear()).slice(2)}W${String(weekNo).padStart(2, "0")}`;
}

function shortDate(s) {
  return s ? s.slice(5) : "";
}

export default function FitnessTrendCharts({ athleteId }) {
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [months, setMonths] = useState(6);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const rows = await base44.entities.DailyMetrics.filter({ athlete_id: athleteId }, "date", 600);
        if (active) setMetrics(rows || []);
      } catch {
        if (active) setMetrics([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [athleteId]);

  const windowed = useMemo(() => {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    const c = cutoff.toISOString().slice(0, 10);
    return metrics.filter((m) => m.date && m.date >= c).sort((a, b) => a.date.localeCompare(b.date));
  }, [metrics, months]);

  const weekly = useMemo(() => {
    const map = {};
    for (const m of windowed) {
      const wk = isoWeekLabel(m.date);
      map[wk] = (map[wk] || 0) + (m.total_trimp || 0);
    }
    return Object.entries(map).map(([week, trimp]) => ({ week, trimp: Math.round(trimp) }));
  }, [windowed]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2 inline" /> Loading fitness history…
        </CardContent>
      </Card>
    );
  }

  if (windowed.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-heading flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> Long-term fitness trends</CardTitle>
          <CardDescription>Chronic/Acute load and weekly volume over time.</CardDescription>
        </CardHeader>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          No daily metrics yet. Once you sync workouts, CTL/ATL/TSB and weekly volume will populate here.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 flex-wrap">
        <div>
          <CardTitle className="font-heading flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> Long-term fitness trends</CardTitle>
          <CardDescription>CTL (fitness) · ATL (fatigue) · TSB (form) and weekly training load.</CardDescription>
        </div>
        <div className="flex gap-1">
          {WINDOWS.map((w) => (
            <Button key={w.months} size="sm" variant={months === w.months ? "default" : "outline"} onClick={() => setMonths(w.months)}>
              {w.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={windowed} margin={{ top: 5, right: 10, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" tickFormatter={shortDate} fontSize={11} tickLine={false} minTickGap={28} />
              <YAxis fontSize={11} tickLine={false} />
              <Tooltip labelFormatter={(l) => l} />
              <ReferenceLine y={0} stroke="hsl(var(--border))" />
              <Line type="monotone" dataKey="calculated_ctl" name="CTL" stroke="hsl(var(--chart-1))" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="calculated_atl" name="ATL" stroke="hsl(var(--chart-5))" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="calculated_tsb" name="TSB" stroke="hsl(var(--chart-3))" dot={false} strokeWidth={2} strokeDasharray="4 2" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1"><BarChart3 className="w-3.5 h-3.5" /> Weekly training load (TRIMP)</p>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekly} margin={{ top: 5, right: 10, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis dataKey="week" fontSize={10} tickLine={false} minTickGap={20} />
                <YAxis fontSize={11} tickLine={false} />
                <Tooltip />
                <Bar dataKey="trimp" name="TRIMP" fill="hsl(var(--chart-2))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}