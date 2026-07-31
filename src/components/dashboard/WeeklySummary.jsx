import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import moment from "moment";
import { useFitness } from "@/context/FitnessContext";

const startOfWeek = (dateStr) => moment(dateStr).startOf("isoWeek").format("YYYY-MM-DD");

function buildWeeks(metrics, sessions) {
  const metricsByWeek = {};
  for (const m of metrics) (metricsByWeek[startOfWeek(m.date)] ||= []).push(m);
  const sessionsByWeek = {};
  for (const s of sessions) (sessionsByWeek[startOfWeek(s.date)] ||= []).push(s);

  const weekKeys = Object.keys(metricsByWeek).sort();
  return weekKeys.map((wk, idx) => {
    const weekMetrics = metricsByWeek[wk].sort((a, b) => a.date.localeCompare(b.date));
    const weekSessions = sessionsByWeek[wk] || [];
    const totalTrimp = weekMetrics.reduce((sum, m) => sum + (m.total_trimp || 0), 0);
    const hrValues = weekSessions.map((s) => s.avg_hr).filter((v) => typeof v === "number");
    const avgHr = hrValues.length ? Math.round(hrValues.reduce((a, b) => a + b, 0) / hrValues.length) : null;
    const last = weekMetrics[weekMetrics.length - 1];
    const bestDay = weekMetrics.reduce((best, m) => (!best || (m.total_trimp || 0) > (best.total_trimp || 0) ? m : best), null);

    const prevWeekMetrics = idx > 0 ? metricsByWeek[weekKeys[idx - 1]] : null;
    const prevLast = prevWeekMetrics ? [...prevWeekMetrics].sort((a, b) => a.date.localeCompare(b.date)).slice(-1)[0] : null;
    let trend = "flat";
    if (prevLast && last) {
      if (last.calculated_ctl > prevLast.calculated_ctl + 0.5) trend = "up";
      else if (last.calculated_ctl < prevLast.calculated_ctl - 0.5) trend = "down";
    }

    return {
      weekStart: wk,
      weekEnd: moment(wk).add(6, "days").format("YYYY-MM-DD"),
      totalTrimp: Math.round(totalTrimp * 10) / 10,
      avgHr,
      ctl: last ? Math.round(last.calculated_ctl) : null,
      tsb: last ? Math.round(last.calculated_tsb) : null,
      workoutCount: weekSessions.length,
      bestDay: bestDay ? bestDay.date : null,
      trend,
    };
  });
}

export default function WeeklySummary() {
  const { dailyMetrics, workoutSessions, loading } = useFitness();
  const weeks = useMemo(
    () => buildWeeks(dailyMetrics, workoutSessions).slice(-8).reverse(),
    [dailyMetrics, workoutSessions]
  );

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm font-heading">Weekly summary</CardTitle></CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : weeks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No weekly data yet.</p>
        ) : (
          <div className="space-y-3">
            {weeks.map((w) => (
              <div key={w.weekStart} className="flex items-center justify-between border-b border-border pb-2 last:border-0 last:pb-0">
                <div>
                  <p className="text-sm font-medium">{moment(w.weekStart).format("MMM D")} – {moment(w.weekEnd).format("MMM D")}</p>
                  <p className="text-xs text-muted-foreground">
                    {w.workoutCount} workout{w.workoutCount === 1 ? "" : "s"} · TRIMP {w.totalTrimp}
                    {w.avgHr ? ` · Avg HR ${w.avgHr}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-sm font-semibold">CTL {w.ctl ?? "-"}</p>
                    <p className="text-xs text-muted-foreground">TSB {w.tsb ?? "-"}</p>
                  </div>
                  {w.trend === "up" && <ArrowUp className="w-4 h-4 text-green-500" />}
                  {w.trend === "down" && <ArrowDown className="w-4 h-4 text-red-500" />}
                  {w.trend === "flat" && <Minus className="w-4 h-4 text-muted-foreground" />}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}