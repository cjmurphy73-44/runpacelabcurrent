import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useFitness } from "@/context/FitnessContext";
import moment from "moment";
import { useCoachInjurySignal } from "@/hooks/useCoachInjurySignal";
import { TodaySessionCardView } from "./TodaySessionCardView";

export default function TodaySessionCard({ athleteId }) {
  const { biometricTelemetry } = useFitness() || {};
  const injury = useCoachInjurySignal(athleteId);
  const [session, setSession] = useState(undefined);
  const [plan, setPlan] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setSession(undefined);
    setPlan(null);
    setLoadError(false);
    if (!athleteId) {
      setSession(null);
      return () => { cancelled = true; };
    }
    (async () => {
      try {
        const todayStr = moment().format("YYYY-MM-DD");
        const [sessions, plans] = await Promise.all([
          base44.entities.TrainingPlanSession.filter({ athlete_id: athleteId, date: todayStr }),
          base44.entities.TrainingPlan.filter({ athlete_id: athleteId, status: "active" }, "-created_date", 1),
        ]);
        if (cancelled) return;
        setSession(sessions?.[0] || null);
        setPlan(plans?.[0] || null);
      } catch (error) {
        if (cancelled) return;
        console.error("Today's session could not load:", error);
        setLoadError(true);
      }
    })();
    return () => { cancelled = true; };
  }, [athleteId, retryKey]);

  return <TodaySessionCardView session={session} plan={plan} loadError={loadError}
    onRetry={() => setRetryKey((key) => key + 1)} biometricTelemetry={biometricTelemetry} injury={injury} />;
}
