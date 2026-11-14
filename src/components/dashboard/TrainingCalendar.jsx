import React, { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { downloadWorkoutFile } from "@/services/workoutExport";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import moment from "moment";
import { Download, Sparkles } from "lucide-react";
import { useCoachInjurySignal } from "@/hooks/useCoachInjurySignal";
import CoachHoldCard from "@/components/dashboard/CoachHoldCard";
import { useSubscription } from "@/hooks/useSubscription";
import FeatureGate from "@/components/billing/FeatureGate";
import { sessionsOnDay } from "@/lib/calendarDaySessions";

const ZONE_TRIMP_FACTOR = { Z1: 0.5, Z2: 0.7, Z3: 0.9, Z4: 1.1, Z5: 1.3 };

export default function TrainingCalendar({ athleteId, currentTsb }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [adjustError, setAdjustError] = useState(null);
  const [requesting, setRequesting] = useState(false);
  const injury = useCoachInjurySignal(athleteId);
  const { plan } = useSubscription();

  const load = useCallback(async () => {
    if (!athleteId) { setSessions([]); setLoading(false); return; }
    setLoading(true);
    setLoadError(null);
    try {
      const all = await base44.entities.TrainingPlanSession.filter({ athlete_id: athleteId });
      if (!Array.isArray(all)) throw new Error("Invalid calendar response");
      const today = moment().startOf("day");
      const weekOut = moment().add(6, "days").endOf("day");
      const upcoming = all.filter((s) => moment(s.date, "YYYY-MM-DD", true).isValid() && moment(s.date).isBetween(today, weekOut, null, "[]"));
      setSessions(upcoming);
    } catch {
      setSessions([]);
      setLoadError("Could not load scheduled sessions. Your plan has not been changed.");
    } finally { setLoading(false); }
  }, [athleteId]);

  useEffect(() => { load(); }, [load]);

  const requestMicroadjustment = async () => {
    if (requesting || !athleteId || injury.level === "hold") return;
    setRequesting(true);
    setAdjustError(null);
    try {
      const result = await base44.functions.invoke("requestMicroadjustment", { athlete_id: athleteId, current_tsb: currentTsb });
      if (result?.data?.error || result?.error || result?.data?.success === false) throw new Error("Adjustment was not confirmed.");
      await load();
    } catch {
      setAdjustError("Could not confirm an adjustment. Review your plan before trying again.");
    } finally { setRequesting(false); }
  };

  const days = Array.from({ length: 7 }, (_, i) => moment().add(i, "days").format("YYYY-MM-DD"));

  return (
    <div className="space-y-4">
      <CoachHoldCard
        injury={injury}
        compact
        hideWhenNone
        swappedLabel="Running days below are replaced by rest or easy cross-training."
      />
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-base font-heading font-semibold">Next 7 Days</h2>
        <Button size="sm" variant="outline" onClick={requestMicroadjustment} disabled={requesting || loading || !!loadError || injury.level === "hold"} className="gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          {requesting ? "Adjusting…" : "AI Microadjustment"}
        </Button>
      </div>
      {adjustError && <p role="alert" className="text-sm text-destructive">{adjustError}</p>}
      {loadError && <div role="alert" className="space-y-2"><p className="text-sm text-destructive">{loadError}</p><Button variant="outline" size="sm" onClick={load}>Retry loading calendar</Button></div>}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : loadError ? null : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {days.map((day) => {
            const daySessions = sessionsOnDay(sessions, day);
            const session = daySessions[0];
            const factor = session ? (ZONE_TRIMP_FACTOR[session.prescribed_intensity_zone] || 0.8) : 0;
            const estTrimp = session ? Math.round((session.prescribed_duration_minutes || 0) * factor) : 0;
            return (
              <Card key={day}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{moment(day).format("ddd, MMM D")}</CardTitle>
                </CardHeader>
                <CardContent>
                  {session ? (
                    <div className={injury.level === "hold" && session.sport?.toLowerCase().startsWith("run") ? "space-y-1 text-sm opacity-70" : "space-y-1 text-sm"}>
                      <p className="font-medium capitalize flex items-center gap-1">
                        {session.sport}
                        {injury.level === "hold" && session.sport?.toLowerCase().startsWith("run") && (
                          <span className="text-[10px] uppercase bg-danger/10 text-danger rounded px-1 py-0.5 leading-none">Coach hold</span>
                        )}
                      </p>
                      {injury.level === "hold" && session.sport?.toLowerCase().startsWith("run") && (
                        <p className="text-xs text-danger font-medium">→ Swap to rest / recovery</p>
                      )}
                      <p className="text-muted-foreground">{session.prescribed_duration_minutes} min · {session.prescribed_intensity_zone || "-"}</p>
                      <p className="text-muted-foreground">Target TRIMP ~{estTrimp}</p>
                      {session.rationale_text && <p className="text-xs text-muted-foreground">{session.rationale_text}</p>}
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">{session.status || "Scheduled"}</p>
                      {daySessions.length > 1 && <p className="text-xs font-medium">{daySessions.length - 1} additional scheduled session(s) today. Open your training plan to review all sessions.</p>}
                      <FeatureGate feature="structured_export" plan={plan} compact>
                        <Button size="sm" variant="outline" onClick={() => downloadWorkoutFile(session)} className="gap-1.5 mt-2 w-full">
                          <Download className="w-3.5 h-3.5" /> Export Workout
                        </Button>
                      </FeatureGate>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No session scheduled</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}