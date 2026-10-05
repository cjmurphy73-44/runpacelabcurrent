import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { CalendarClock } from "lucide-react";

// Race-distance → taper length (days). Based on Bosquet et al. (2007) meta-analysis
// (optimal taper ≈ 2 weeks, ~−40% volume, maintained intensity) adjusted by event.
const DISTANCES = [
  { id: "5K", km: 5, days: 9 },
  { id: "10K", km: 10, days: 12 },
  { id: "half", km: 21.1, days: 16 },
  { id: "full", km: 42.2, days: 24 },
];

function addDays(dateStr, n) {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function prettyDate(s) {
  return new Date(s + "T00:00:00Z").toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
}

const PHASE_COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--zone-5))"];

export default function RaceTaperCalculator({ athlete }) {
  const today = new Date();
  const minDate = today.toISOString().slice(0, 10);

  const [distance, setDistance] = useState("10K");
  const [raceDate, setRaceDate] = useState(addDays(minDate, 21));
  const [peakWeekly, setPeakWeekly] = useState(300);
  const [ctl] = useState(athlete?.current_ctl || 0);

  const taperDays = DISTANCES.find((d) => d.id === distance)?.days || 14;

  const schedule = useMemo(() => {
    const peakDaily = (Number(peakWeekly) || 0) / 6; // assume ~6 sessions/week
    const days = [];
    for (let i = 0; i <= taperDays; i++) {
      const isRace = i === taperDays;
      const p = i / taperDays;
      const frac = isRace ? 0.12 : Math.max(0.1, 0.85 * Math.exp(-1.05 * p));
      const third = taperDays / 3;
      const phase = isRace ? "Race day" : i < third ? "Maintain" : i < third * 2 ? "Reduce" : "Sharpen";
      days.push({
        date: addDays(raceDate, i - taperDays),
        offset: i - taperDays,
        phase,
        frac: Math.round(frac * 100),
        minutes: Math.round(peakDaily * frac),
        isRace,
      });
    }
    return days;
  }, [raceDate, taperDays, peakWeekly]);

  const phaseTotals = useMemo(() => {
    const totals = { Maintain: 0, Reduce: 0, Sharpen: 0 };
    for (const d of schedule) {
      if (totals[d.phase] !== undefined) totals[d.phase] += d.minutes;
    }
    return totals;
  }, [schedule]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading flex items-center gap-2"><CalendarClock className="w-4 h-4 text-primary" /> Race taper calculator</CardTitle>
        <CardDescription>Exponential volume taper that keeps intensity and sheds fatigue — modelled on Bosquet et al. (2007).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>Race distance</Label>
            <Select value={distance} onValueChange={setDistance}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DISTANCES.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.id === "half" ? "Half marathon" : d.id === "full" ? "Marathon" : d.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Race date</Label>
            <Input type="date" min={minDate} value={raceDate} onChange={(e) => setRaceDate(e.target.value || minDate)} />
          </div>
          <div className="space-y-1.5">
            <Label>Peak weekly volume (min)</Label>
            <Input type="number" min={0} value={peakWeekly} onChange={(e) => setPeakWeekly(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Taper length" value={`${taperDays} days`} />
          <Stat label="Taper starts" value={schedule[0] ? prettyDate(schedule[0].date) : "—"} />
          <Stat label="Peak daily target" value={`${Math.round((Number(peakWeekly) || 0) / 6)} min`} />
          <Stat label="Current fitness (CTL)" value={ctl ? ctl.toFixed(0) : "—"} />
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          {Object.entries(phaseTotals).map(([phase, mins], i) => (
            <div key={phase} className="rounded-md border border-border p-2">
              <p className="font-medium" style={{ color: PHASE_COLORS[i] }}>{phase}</p>
              <p className="text-muted-foreground tabular-nums">{mins} min total</p>
            </div>
          ))}
        </div>

        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={schedule} margin={{ top: 5, right: 10, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis dataKey="offset" fontSize={10} tickLine={false} tickFormatter={(v) => (v === 0 ? "R" : `${v}`)} />
              <YAxis fontSize={11} tickLine={false} />
              <Tooltip labelFormatter={(v) => `Day ${v}`} />
              <Bar dataKey="minutes" name="Daily target (min)" radius={[3, 3, 0, 0]}>
                {schedule.map((d, i) => (
                  <Cell key={i} fill={d.isRace ? PHASE_COLORS[3] : PHASE_COLORS[["Maintain", "Reduce", "Sharpen"].indexOf(d.phase)]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-md border border-border">
          <div className="max-h-64 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/60 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Phase</th>
                  <th className="px-3 py-2 font-medium text-right">Load</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((d, i) => (
                  <tr key={i} className={`border-t border-border ${d.isRace ? "bg-destructive/5 font-medium" : ""}`}>
                    <td className="px-3 py-1.5 tabular-nums">{prettyDate(d.date)}{d.isRace && " 🏁"}</td>
                    <td className="px-3 py-1.5">{d.phase}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{d.minutes} min · {d.frac}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Model: daily volume = peak daily × 0.85·e^(−1.05·progress), clamped ≥10%; race day is a short activation tune-up. Keep intensity race-specific throughout — only volume is tapered.
        </p>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-md border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-heading font-semibold tabular-nums">{value}</p>
    </div>
  );
}