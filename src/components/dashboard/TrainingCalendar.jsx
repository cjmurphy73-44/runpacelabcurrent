import React, { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { downloadWorkoutFile } from "@/services/workoutExport";
import TrainingCalendarDay from "@/components/trainingplan/TrainingCalendarDay";
import { Button } from "@/components/ui/button";
import moment from "moment";
import { Sparkles } from "lucide-react";
import { useCoachInjurySignal } from "@/hooks/useCoachInjurySignal";
import CoachHoldCard from "@/components/dashboard/CoachHoldCard";
import { useSubscription } from "@/hooks/useSubscription";


export default function TrainingCalendar({ athleteId, currentTsb }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const injury = useCoachInjurySignal(athleteId);
  const { plan } = useSubscription();

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const all = await base44.entities.TrainingPlanSession.filter({ athlete_id: athleteId });
      if (!Array.isArray(all)) throw new Error("Calendar response is not a session list");
      const today = moment().startOf("day");
      const weekOut = moment().add(6, "days").endOf("day");
      setSessions(all.filter((session) => moment(session.date).isBetween(today, weekOut, null, "[]")));
      setHasLoaded(true);
    } catch {
      setLoadError(true);
      // An unverified response is not evidence that dates are rest days.
    } finally {
      setLoading(false);
    }
  }, [athleteId]);

  useEffect(() => { load(); }, [load]);

  const requestMicroadjustment = async () => {
    setRequesting(true);
    await base44.functions.invoke("requestMicroadjustment", { athlete_id: athleteId, current_tsb: currentTsb });
    await load();
    setRequesting(false);
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
        <Button size="sm" variant="outline" onClick={requestMicroadjustment} disabled={requesting} className="gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          {requesting ? "Adjusting…" : "AI Microadjustment"}
        </Button>
      </div>
      {loadError && (
        <div role="alert" className="rounded-md border border-destructive/30 p-3 space-y-2">
          <p className="text-sm">Could not load the training calendar. Rest days are not confirmed.</p>
          <Button type="button" variant="outline" size="sm" onClick={load} disabled={loading}>Retry calendar</Button>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {days.map((date) => (
          <TrainingCalendarDay
            key={date}
            date={date}
            sessions={sessions}
            loading={loading}
            failed={loadError || !hasLoaded && !loading}
            injury={injury}
            plan={plan}
            onExport={downloadWorkoutFile}
          />
        ))}
      </div>
    </div>
  );
}