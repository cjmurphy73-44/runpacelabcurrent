import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ZoneBadge from "@/components/ui/ZoneBadge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useFitness } from "@/context/FitnessContext";
import { CheckCircle2, Moon, AlertTriangle } from "lucide-react";
import moment from "moment";

function detectAnomaly(biometricTelemetry) {
  const sorted = [...(biometricTelemetry || [])].sort((a, b) => b.date.localeCompare(a.date));
  const hrvValues = sorted.map((r) => r.hrv_ms).filter((v) => typeof v === "number");
  if (hrvValues.length < 4) return false;
  const baseline = hrvValues.slice(1).reduce((a, b) => a + b, 0) / hrvValues.slice(1).length;
  return hrvValues[0] < baseline * 0.85;
}

export default function TodaySessionCard({ athleteId }) {
  const { biometricTelemetry } = useFitness() || {};
  const [session, setSession] = useState(undefined);
  const [plan, setPlan] = useState(null);

  useEffect(() => {
    if (!athleteId) return;
    (async () => {
      const todayStr = moment().format("YYYY-MM-DD");
      const [sessions, plans] = await Promise.all([
        base44.entities.TrainingPlanSession.filter({ athlete_id: athleteId, date: todayStr }),
        base44.entities.TrainingPlan.filter({ athlete_id: athleteId, status: "active" }, "-created_date", 1),
      ]);
      setSession(sessions?.[0] || null);
      setPlan(plans?.[0] || null);
    })();
  }, [athleteId]);

  const anomaly = detectAnomaly(biometricTelemetry);
  const paceZone = plan?.pace_zones?.find((z) => z.zone === session?.prescribed_intensity_zone);
  const hrvAdvice = plan?.hrv_framework?.find((f) => /hrv|suppress|low/i.test(f.condition || ""));

  return (
    <Card className="h-full border-border shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground font-heading uppercase tracking-wide">Today's Session</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {session === undefined ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : session ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-2xl font-heading font-bold capitalize">{session.sport}</h3>
              <ZoneBadge zone={session.prescribed_intensity_zone} />
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Duration</p>
                <p className="font-medium">{session.prescribed_duration_minutes} min</p>
              </div>
              {paceZone && (
                <>
                  <div>
                    <p className="text-muted-foreground text-xs">Target Pace</p>
                    <p className="font-medium">{paceZone.pace_range}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Target HR</p>
                    <p className="font-medium">{paceZone.hr_range}</p>
                  </div>
                </>
              )}
            </div>
            {session.rationale_text && <p className="text-sm text-muted-foreground">{session.rationale_text}</p>}
          </div>
        ) : (
          <div className="flex items-center gap-3 py-2">
            <Moon className="w-8 h-8 text-primary" />
            <div>
              <p className="font-heading font-bold text-lg">Rest Day</p>
              <p className="text-sm text-muted-foreground">No session scheduled — focus on recovery.</p>
            </div>
          </div>
        )}

        {anomaly && (
          <Alert variant="destructive">
            <AlertTriangle className="w-4 h-4" />
            <AlertTitle>Recovery Alert</AlertTitle>
            <AlertDescription>
              {hrvAdvice?.action || "Your HRV is notably below baseline — consider easing today's intensity or swapping to recovery."}
            </AlertDescription>
          </Alert>
        )}

        {!anomaly && session && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Readiness normal — proceed as prescribed.
          </div>
        )}
      </CardContent>
    </Card>
  );
}