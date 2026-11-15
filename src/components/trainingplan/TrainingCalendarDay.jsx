import React from "react";
import moment from "moment";
import { Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import FeatureGate from "@/components/billing/FeatureGate";
import { calendarDayState } from "@/lib/calendarDaySessions";

const ZONE_TRIMP_FACTOR = { Z1: 0.5, Z2: 0.7, Z3: 0.9, Z4: 1.1, Z5: 1.3 };

export default function TrainingCalendarDay({ date, sessions, loading = false, failed = false, injury, plan, onExport }) {
  const day = calendarDayState({ sessions, date, loading, failed });
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{moment(date).format("ddd, MMM D")}</CardTitle>
      </CardHeader>
      <CardContent>
        {day.kind === "unavailable" ? (
          <p role="status" className="text-sm text-muted-foreground">Schedule unavailable. Rest day not confirmed.</p>
        ) : day.kind === "loading" ? (
          <p role="status" className="text-sm text-muted-foreground">Loading scheduled sessions…</p>
        ) : day.kind === "rest" ? (
          <p className="text-sm text-muted-foreground">No sessions scheduled</p>
        ) : (
          <div className="space-y-3" aria-label={`${day.sessions.length} scheduled session${day.sessions.length === 1 ? "" : "s"}`}>
            {day.sessions.map((session, index) => {
              const runningHold = injury?.level === "hold" && session.sport?.toLowerCase().startsWith("run");
              const factor = ZONE_TRIMP_FACTOR[session.prescribed_intensity_zone] || 0.8;
              const estimate = Math.round((session.prescribed_duration_minutes || 0) * factor);
              return (
                <section key={session.id || `${date}-${index}`} className={`rounded-md border border-border p-3 space-y-2 text-sm ${runningHold ? "opacity-70" : ""}`}>
                  <div className="flex justify-between items-start gap-2">
                    <p className="font-semibold capitalize">{session.title || session.sport || "Planned session"}</p>
                    {day.sessions.length > 1 && <span className="text-xs text-muted-foreground shrink-0">Session {index + 1} of {day.sessions.length}</span>}
                  </div>
                  {runningHold && <p className="text-xs font-medium text-destructive">Coach hold: swap running to rest or recovery</p>}
                  <p className="text-muted-foreground">{session.prescribed_duration_minutes || 0} min · {session.prescribed_intensity_zone || "Intensity unspecified"}</p>
                  <p className="text-muted-foreground">Estimated TRIMP ~{estimate}</p>
                  {session.rationale_text && <p className="text-xs text-muted-foreground">{session.rationale_text}</p>}
                  {session.status && <p className="text-xs uppercase tracking-wide text-muted-foreground">{session.status}</p>}
                  {onExport && (
                    <FeatureGate feature="structured_export" plan={plan} compact>
                      <Button type="button" size="sm" variant="outline" onClick={() => onExport(session)} className="gap-1.5 w-full min-h-11">
                        <Download className="w-3.5 h-3.5" /> Export Workout
                      </Button>
                    </FeatureGate>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
