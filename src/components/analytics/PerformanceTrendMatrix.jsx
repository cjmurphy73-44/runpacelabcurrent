import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  Legend,
} from "recharts";
import { Activity } from "lucide-react";

// Multi-axis 12-week rolling trend: Weekly Volume (km + hours) against ACWR
// and resting heart rate. ACWR = acute(7d load) / chronic(28d load ÷ 4).

function localISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}
function addDays(d, n) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}
function cutoffISO(days) {
  return localISO(addDays(new Date(), -days));
}

export default function PerformanceTrendMatrix({ athleteId }) {
  const [sessions, setSessions] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [s, m] = await Promise.all([
          base44.entities.WorkoutSession.filter(
            { athlete_id: athleteId, date: { $gte: cutoffISO(120) } },
            "date",
            1000
          ),
          base44.entities.DailyMetrics.filter(
            { athlete_id: athleteId, date: { $gte: cutoffISO(120) } },
            "date",
            1000
          ),
        ]);
        if (!active) return;
        setSessions(s || []);
        setMetrics(m || []);
      } catch {
        if (active) {
          setSessions([]);
          setMetrics([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [athleteId]);

  const data = useMemo(() => {
    const dayLoad = {};
    const dayKm = {};
    const dayHours = {};
    const dayHr = {};
    sessions.forEach((s) => {
      if (!s.date) return;
      dayLoad[s.date] = (dayLoad[s.date] || 0) + (s.session_tss || s.session_trimp || 0);
      dayKm[s.date] = (dayKm[s.date] || 0) + (s.distance_km || 0);
      dayHours[s.date] = (dayHours[s.date] || 0) + (s.duration_minutes || 0) / 60;
    });
    metrics.forEach((m) => {
      if (m.date && m.resting_hr) dayHr[m.date] = m.resting_hr;
    });

    const sumLoad = (endDate, days) => {
      let total = 0;
      const end = new Date(endDate + "T00:00:00");
      for (let i = 0; i < days; i++) {
        const ds = localISO(addDays(end, -i));
        total += dayLoad[ds] || 0;
      }
      return total;
    };

    // align current week to Monday
    const today = new Date();
    const weekStart = addDays(today, -((today.getDay() + 6) % 7));
    const buckets = [];
    for (let i = 11; i >= 0; i--) {
      const ws = addDays(weekStart, -i * 7);
      const we = addDays(ws, 6);
      let km = 0,
        hours = 0,
        hrSum = 0,
        hrN = 0;
      for (let d = new Date(ws); d <= we; d = addDays(d, 1)) {
        const ds = localISO(d);
        km += dayKm[ds] || 0;
        hours += dayHours[ds] || 0;
        if (dayHr[ds]) {
          hrSum += dayHr[ds];
          hrN++;
        }
      }
      const endISO = localISO(we);
      const acute = sumLoad(endISO, 7);
      const chronic = sumLoad(endISO, 28) / 4;
      const acwr = chronic > 0 ? acute / chronic : 0;
      buckets.push({
        week: `${localISO(ws).slice(5)}`,
        km: +km.toFixed(1),
        hours: +hours.toFixed(1),
        acwr: +acwr.toFixed(2),
        restingHr: hrN ? Math.round(hrSum / hrN) : null,
      });
    }
    return buckets;
  }, [sessions, metrics]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Loading trend matrix…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" /> Performance Trend Matrix
        </CardTitle>
        <CardDescription>
          12-week rolling view · weekly volume (km/hours) vs. acute:chronic workload ratio
          (ACWR) and resting heart rate.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 5, right: 10, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="week" fontSize={10} tickLine={false} minTickGap={16} />
              <YAxis yAxisId="vol" fontSize={11} tickLine={false} />
              <YAxis
                yAxisId="acwr"
                orientation="right"
                domain={[0, 2.5]}
                fontSize={11}
                tickLine={false}
              />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine yAxisId="acwr" y={1.5} stroke="hsl(var(--destructive))" strokeDasharray="4 2" />
              <Bar yAxisId="vol" dataKey="km" name="Volume (km)" fill="hsl(var(--chart-2))" radius={[3, 3, 0, 0]} barSize={18} />
              <Line yAxisId="vol" type="monotone" dataKey="hours" name="Volume (hrs)" stroke="hsl(var(--chart-4))" dot={false} strokeWidth={2} />
              <Line yAxisId="acwr" type="monotone" dataKey="acwr" name="ACWR" stroke="hsl(var(--chart-5))" dot={false} strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Resting heart rate trend</p>
          <div className="h-36 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 5, right: 10, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="week" fontSize={10} tickLine={false} minTickGap={16} />
                <YAxis fontSize={11} tickLine={false} domain={["dataMin - 3", "dataMax + 3"]} />
                <Tooltip />
                <Line type="monotone" dataKey="restingHr" name="Resting HR" stroke="hsl(var(--chart-3))" dot={{ r: 2 }} strokeWidth={2} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}