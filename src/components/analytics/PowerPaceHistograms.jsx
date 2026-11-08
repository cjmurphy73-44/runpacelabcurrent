import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { Loader2, Activity } from "lucide-react";
import { hasVerifiedStreams } from "@/lib/streamValidity";

const MODES = [
  { id: "pace", label: "Run pace", hint: "Distribution of session pace (min/km)" },
  { id: "power", label: "Cycling power", hint: "Distribution of session power (watts)" },
  { id: "hr", label: "HR zones", hint: "Time in zone (minutes), from per-second heart rate" },
];

const ZONE_COLORS = ["hsl(var(--zone-1))", "hsl(var(--zone-2))", "hsl(var(--zone-3))", "hsl(var(--zone-4))", "hsl(var(--zone-5))"];

const ZONE_BARS = ["Z1", "Z2", "Z3", "Z4", "Z5"];

const PACE_BINS = [200, 240, 270, 300, 330, 360, 390, 420, Infinity];
const POWER_BINS = [0, 100, 150, 200, 250, 300, 350, 400, Infinity];

function secToPace(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export default function PowerPaceHistograms({ athleteId, maxHr, ftpWatts }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("pace");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const rows = await base44.entities.WorkoutSession.filter({ athlete_id: athleteId }, "-date", 200);
        if (active) setSessions(rows || []);
      } catch {
        if (active) setSessions([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [athleteId]);

  const paceData = useMemo(() => {
    const counts = PACE_BINS.slice(0, -1).map((lo, i) => {
      const hi = PACE_BINS[i + 1];
      const label = i === 0 ? `≤${secToPace(hi)}` : hi === Infinity ? `>${secToPace(lo)}` : `${secToPace(lo)}–${secToPace(hi)}`;
      return { label, count: 0 };
    });
    for (const s of sessions) {
      if (!s.sport || !s.sport.toLowerCase().startsWith("run")) continue;
      if (!s.distance_km || !s.duration_seconds) continue;
      const pace = s.duration_seconds / s.distance_km;
      let idx = PACE_BINS.findIndex((b, i) => pace >= b && pace < PACE_BINS[i + 1]);
      if (idx === -1) idx = PACE_BINS.length - 2;
      if (idx < 0) counts[0].count++;
      else counts[idx >= counts.length ? counts.length - 1 : idx].count++;
    }
    return counts;
  }, [sessions]);

  const powerData = useMemo(() => {
    const counts = POWER_BINS.slice(0, -1).map((lo, i) => {
      const hi = POWER_BINS[i + 1];
      const label = i === 0 ? `≤100W` : hi === Infinity ? `>400W` : `${lo}–${hi}W`;
      return { label, count: 0 };
    });
    for (const s of sessions) {
      if (!s.sport || !s.sport.toLowerCase().startsWith("cycl")) continue;
      if (!s.avg_power) continue;
      let idx = POWER_BINS.findIndex((b, i) => s.avg_power >= b && s.avg_power < POWER_BINS[i + 1]);
      if (idx === -1) idx = POWER_BINS.length - 2;
      counts[idx >= counts.length ? counts.length - 1 : idx].count++;
    }
    return counts;
  }, [sessions]);

  // Real time in zone only. Minutes come from sessions that carry a verified
  // second-by-second stream; a session's average heart rate is never spread across a
  // zone here, so summary-only imports cannot shape this chart.
  const hrData = useMemo(() => {
    const bars = ZONE_BARS.map((label) => ({ label, minutes: 0 }));
    for (const s of sessions) {
      if (s.zone_method !== "stream" || !hasVerifiedStreams(s)) continue;
      const seconds = Array.isArray(s.zone_seconds) ? s.zone_seconds : [];
      seconds.forEach((sec, i) => {
        if (i < bars.length) bars[i].minutes += (Number(sec) || 0) / 60;
      });
    }
    return bars.map((b) => ({ ...b, minutes: Math.round(b.minutes * 10) / 10 }));
  }, [sessions]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2 inline" /> Loading sessions…
        </CardContent>
      </Card>
    );
  }

  const activeMode = MODES.find((m) => m.id === mode);
  const data = mode === "pace" ? paceData : mode === "power" ? powerData : hrData;
  const valueKey = mode === "hr" ? "minutes" : "count";
  const hasData = data.some((d) => d[valueKey] > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading flex items-center gap-2"><Activity className="w-4 h-4 text-primary" /> Workload distribution</CardTitle>
        <CardDescription>{activeMode.hint}{!hasData && ", no matching sessions yet."}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-1">
          {MODES.map((m) => (
            <Button key={m.id} size="sm" variant={mode === m.id ? "default" : "outline"} onClick={() => setMode(m.id)}>
              {m.label}
            </Button>
          ))}
        </div>
        {hasData ? (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 5, right: 10, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis dataKey="label" fontSize={10} tickLine={false} interval={0} angle={-20} textAnchor="end" height={48} />
                <YAxis fontSize={11} tickLine={false} />
                <Tooltip />
                <Bar dataKey={valueKey} radius={[3, 3, 0, 0]} name={valueKey === "minutes" ? "Minutes" : "Sessions"}>
                  {mode === "hr"
                    ? data.map((_, i) => <Cell key={i} fill={ZONE_COLORS[i % ZONE_COLORS.length]} />)
                    : <Cell fill="hsl(var(--chart-2))" />}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No data for this view yet. Use a different distribution or import more workouts.
          </div>
        )}
      </CardContent>
    </Card>
  );
}