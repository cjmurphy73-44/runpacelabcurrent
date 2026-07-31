import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const PHASE_COLORS = {
  base: "bg-secondary",
  build: "bg-primary/60",
  peak: "bg-primary",
  taper: "bg-chart-4",
  race: "bg-destructive",
};

function phaseColor(phase) {
  const key = Object.keys(PHASE_COLORS).find((k) => (phase || "").toLowerCase().includes(k));
  return PHASE_COLORS[key] || "bg-muted-foreground/40";
}

export default function TrainingPlanTimeline({ plan }) {
  const [openWeek, setOpenWeek] = useState(null);
  const macrocycle = plan.macrocycle || [];
  const active = macrocycle.find((w) => w.week_number === openWeek);
  const milestones = (plan.goal_architecture || []).flatMap((row) =>
    (row.milestones || []).map((m) => ({ metric: row.metric, ...m }))
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-heading">{plan.plan_title}</CardTitle>
          <Badge variant="secondary" className="w-fit capitalize">{plan.tier} tier</Badge>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{plan.athlete_summary}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-heading">Macrocycle Timeline</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-1 overflow-x-auto pb-1">
            {macrocycle.map((w) => (
              <button
                key={w.week_number}
                onClick={() => setOpenWeek(openWeek === w.week_number ? null : w.week_number)}
                className={`shrink-0 flex flex-col items-center gap-1 rounded-md px-3 py-2 border transition-colors ${
                  openWeek === w.week_number ? "border-primary bg-accent" : "border-border hover:bg-accent/50"
                }`}
                title={w.phase}
              >
                <span className={`w-8 h-2 rounded-full ${phaseColor(w.phase)}`} />
                <span className="text-xs font-medium">W{w.week_number}</span>
                {w.deload && <span className="text-[10px] text-muted-foreground">Deload</span>}
              </button>
            ))}
          </div>

          {active && (
            <div className="rounded-lg border border-border p-4 space-y-2 text-sm">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="font-medium">Week {active.week_number} — {active.phase}</p>
                <span className="text-xs text-muted-foreground">{active.start_date} – {active.end_date}</span>
              </div>
              <p className="text-muted-foreground">Key session: {active.key_session}</p>
              {active.deload && <Badge variant="secondary">Deload week</Badge>}
            </div>
          )}

          {milestones.length > 0 && (
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">Goal Milestones</p>
              <div className="flex flex-wrap gap-2">
                {milestones.map((m, idx) => (
                  <Badge key={idx} variant="outline" className="font-normal">
                    {m.metric}: {m.label} → {m.target}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {plan.pace_zones?.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-heading">Training Pace Reference</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border">
                  <th className="py-2 pr-3">Zone</th>
                  <th className="py-2 pr-3">Pace</th>
                  <th className="py-2 pr-3">Heart Rate</th>
                  <th className="py-2 pr-3">Purpose</th>
                </tr>
              </thead>
              <tbody>
                {plan.pace_zones.map((z, idx) => (
                  <tr key={idx} className="border-b border-border last:border-0">
                    <td className="py-2 pr-3 font-medium">{z.zone}</td>
                    <td className="py-2 pr-3">{z.pace_range}</td>
                    <td className="py-2 pr-3">{z.hr_range}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{z.purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}