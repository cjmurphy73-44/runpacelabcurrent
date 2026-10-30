import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { CalendarRange } from "lucide-react";
import moment from "moment";

// Weekly volume context for the Today view: prescribed minutes from the active plan
// versus minutes actually completed this calendar week. Two batched reads, no maths
// beyond a sum, so the athlete can see today's session in its weekly frame.
export default function WeeklyVolumeLine({ athleteId }) {
  const [state, setState] = useState({ loading: true, planned: 0, done: 0 });

  useEffect(() => {
    if (!athleteId) return;
    let cancelled = false;
    (async () => {
      const start = moment().startOf("isoWeek").format("YYYY-MM-DD");
      const end = moment().endOf("isoWeek").format("YYYY-MM-DD");
      const range = { $gte: start, $lte: end };
      try {
        const [planned, completed] = await Promise.all([
          base44.entities.TrainingPlanSession.filter({ athlete_id: athleteId, date: range }, "date", 200),
          base44.entities.WorkoutSession.filter({ athlete_id: athleteId, date: range }, "date", 200),
        ]);
        const sum = (rows, key) => {
          const list = Array.isArray(rows) ? rows : rows?.items || [];
          return list.reduce((total, r) => total + (Number(r?.[key]) || 0), 0);
        };
        if (!cancelled) {
          setState({
            loading: false,
            planned: Math.round(sum(planned, "prescribed_duration_minutes")),
            done: Math.round(sum(completed, "duration_minutes")),
          });
        }
      } catch {
        if (!cancelled) setState({ loading: false, planned: 0, done: 0 });
      }
    })();
    return () => { cancelled = true; };
  }, [athleteId]);

  if (state.loading) return <div className="h-6 w-56 rounded bg-muted animate-pulse" />;
  if (!state.planned && !state.done) return null;

  const pct = state.planned > 0 ? Math.min(100, Math.round((state.done / state.planned) * 100)) : null;

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <CalendarRange className="w-3.5 h-3.5 text-primary shrink-0" />
      <span>
        This week: <span className="text-foreground font-medium">{state.done}</span>
        {state.planned > 0 && <> of <span className="text-foreground font-medium">{state.planned}</span></>} min
        {pct != null && <> · {pct}% of planned volume</>}
      </span>
    </div>
  );
}