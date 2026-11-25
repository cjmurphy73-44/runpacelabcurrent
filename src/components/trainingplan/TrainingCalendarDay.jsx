import React, { useState } from "react";
import moment from "moment";
import { Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import FeatureGate from "@/components/billing/FeatureGate";
import { calendarDayState } from "@/lib/calendarDaySessions";
import { previewPlanSessionMove } from "@/lib/planReschedulePreview";

const ZONE_TRIMP_FACTOR = { Z1: 0.5, Z2: 0.7, Z3: 0.9, Z4: 1.1, Z5: 1.3 };

export default function TrainingCalendarDay({ date, sessions, loading = false, failed = false, stale = false, injury, plan, onExport, athleteId, today, calendarEnd }) {
  const [expandedSession, setExpandedSession] = useState(null);
  const [movingSession, setMovingSession] = useState(null);
  const [moveDate, setMoveDate] = useState("");
  const [movePreview, setMovePreview] = useState(null);
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
          <p className="text-sm text-muted-foreground">{stale ? "No current schedule confirmed for this day." : "No sessions scheduled"}</p>
        ) : (
          <div className="space-y-3" aria-label={`${day.sessions.length} scheduled session${day.sessions.length === 1 ? "" : "s"}`}>
            {day.sessions.map((session, index) => {
              const runningHold = injury?.level === "hold" && session.sport?.toLowerCase().startsWith("run");
              const factor = ZONE_TRIMP_FACTOR[session.prescribed_intensity_zone] || 0.8;
              const estimate = Math.round((session.prescribed_duration_minutes || 0) * factor);
              const detailKey = `${date}-${session.id || index}`;
              const open = expandedSession === detailKey;
              const steps = Array.isArray(session.structured_steps) ? session.structured_steps : [];
              const hasDetails = Boolean(session.description || session.target_pace || session.target_power > 0 ||
                session.target_hr_low > 0 || session.target_hr_high > 0 || steps.length);
              return (
                <section key={session.id || `${date}-${index}`} className={`rounded-md border border-border p-3 space-y-2 text-sm ${runningHold ? "opacity-70" : ""}`}>
                  <div className="flex justify-between items-start gap-2">
                    <p className="font-semibold capitalize">{session.title || session.sport || "Planned session"}</p>
                    {day.sessions.length > 1 && <span className="text-xs text-muted-foreground shrink-0">Session {index + 1} of {day.sessions.length}</span>}
                  </div>
                  {stale && <p className="text-xs text-muted-foreground">Last loaded prescription, not a verified current schedule</p>}
                  {runningHold && <p className="text-xs font-medium text-destructive">Coach hold: swap running to rest or recovery</p>}
                  <p className="text-muted-foreground">{session.prescribed_duration_minutes || 0} min · {session.prescribed_intensity_zone || "Intensity unspecified"}</p>
                  <p className="text-muted-foreground">Estimated TRIMP ~{estimate}</p>
                  {session.rationale_text && <p className="text-xs text-muted-foreground">{session.rationale_text}</p>}
                  {session.status && <p className="text-xs uppercase tracking-wide text-muted-foreground">{session.status}</p>}
                  {hasDetails && (
                    <>
                      <button type="button" className="w-full min-h-11 rounded border border-border px-3 text-left text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                        aria-expanded={open} aria-controls={`session-details-${detailKey}`}
                        onClick={() => setExpandedSession(open ? null : detailKey)}>
                        {open ? "Hide session details" : "View session details"}
                      </button>
                      {open && (
                        <div id={`session-details-${detailKey}`} className="space-y-2 rounded-md bg-muted/40 p-3 text-sm">
                          {session.description && <p>{session.description}</p>}
                          {session.target_pace && <p>Target pace: {session.target_pace}</p>}
                          {session.target_power > 0 && <p>Target power: {session.target_power} W</p>}
                          {(session.target_hr_low > 0 || session.target_hr_high > 0) && (
                            <p>Target heart rate: {session.target_hr_low || "Not specified"} to {session.target_hr_high || "Not specified"} bpm</p>
                          )}
                          {steps.length > 0 && (
                            <div className="space-y-2">
                              <p className="font-medium">Prescribed workout steps</p>
                              <ol className="list-decimal pl-5 space-y-1">
                                {steps.map((step, stepIndex) => (
                                  <li key={step.order ?? stepIndex}>
                                    <span className="capitalize">{step.type || "Step"}</span>
                                    {Number.isFinite(step.duration_seconds) && <span> · {step.duration_seconds} sec</span>}
                                    {step.description && <span> · {step.description}</span>}
                                  </li>
                                ))}
                              </ol>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                  {!stale && !loading && !failed && !runningHold &&
                    session.status === "pending" && session.id && session.training_plan_id &&
                    session.athlete_id === athleteId && (
                    <div className="space-y-2">
                      <button type="button"
                        className="min-h-11 w-full rounded-md border border-border px-3 text-left font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                        onClick={() => {
                          setMovingSession(movingSession === detailKey ? null : detailKey);
                          setMoveDate("");
                          setMovePreview(null);
                        }}>
                        {movingSession === detailKey ? "Cancel move preview" : "Preview reschedule"}
                      </button>
                      {movingSession === detailKey && (
                        <div className="rounded-md border border-border p-3 space-y-3">
                          <p className="text-xs text-muted-foreground">Preview only. This cannot save or move a workout.</p>
                          <label className="block text-sm font-medium" htmlFor={`move-date-${detailKey}`}>Proposed new date</label>
                          <input id={`move-date-${detailKey}`} type="date"
                            className="min-h-11 w-full rounded border border-border bg-background px-3 text-base"
                            min={today} max={calendarEnd} value={moveDate}
                            onChange={(event) => { setMoveDate(event.target.value); setMovePreview(null); }} />
                          <button type="button" className="min-h-11 w-full rounded border border-border px-3 font-medium"
                            onClick={() => setMovePreview(previewPlanSessionMove({
                              session, destination: moveDate, sessions, athleteId, today, calendarEnd,
                            }))}>
                            Check proposed move
                          </button>
                          {movePreview && (
                            <p role="status" className={`text-sm ${movePreview.ok ? "text-muted-foreground" : "text-destructive"}`}>
                              {movePreview.ok
                                ? `Proposed: ${movePreview.from} to ${movePreview.to}. Not saved. Your calendar remains unchanged.`
                                : movePreview.reason}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
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
