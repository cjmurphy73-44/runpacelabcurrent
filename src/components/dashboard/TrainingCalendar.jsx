import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { base44 } from "@/api/base44Client";
import { downloadWorkoutFile } from "@/services/workoutExport";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import moment from "moment";
import { Download, Sparkles } from "lucide-react";
import CoachSignalNotice from "@/components/dashboard/CoachSignalNotice";
import { useSubscription } from "@/hooks/useSubscription";
import FeatureGate from "@/components/billing/FeatureGate";

const ZONE_TRIMP_FACTOR = { Z1: 0.5, Z2: 0.7, Z3: 0.9, Z4: 1.1, Z5: 1.3 };

export default function TrainingCalendar(props) {
  const { user } = useAuth();
  return <TrainingCalendarContent key={`${user?.id}:${props.athleteId}`} {...props} />;
}

function TrainingCalendarContent({ athleteId, currentTsb }) {
  const { plan } = useSubscription();
  const { user } = useAuth();
  const client = useQueryClient();
  const dayKey = moment().format('YYYY-MM-DD');
  const prefix = ['athlete-plan', user?.id, athleteId];
  const query = useQuery({
    queryKey: [...prefix, 'week', dayKey],
    enabled: Boolean(user?.id && athleteId), retry: false,
    queryFn: () => base44.entities.TrainingPlanSession.filter({ athlete_id: athleteId,
      date: { $gte: dayKey, $lte: moment().add(6, 'days').format('YYYY-MM-DD') } }),
  });
  const sessions = query.data || [];
  const adjustment = useMutation({
    mutationFn: async () => {
      const result = await base44.functions.invoke('requestMicroadjustment', { athlete_id: athleteId, current_tsb: currentTsb });
      if (result.data?.success !== true || !Array.isArray(result.data.adjusted)) throw new Error('Adjustment was not confirmed');
      return result.data;
    },
    // Even a failed request can have partially saved changes. Re-fetch stored
    // truth across both calendar and today, without claiming no writes occurred.
    onSettled: async () => { await client.invalidateQueries({ queryKey: prefix }); },
  });

  const days = Array.from({ length: 7 }, (_, i) => moment().add(i, "days").format("YYYY-MM-DD"));

  return (
    <div className="space-y-4">
      <CoachSignalNotice athleteId={athleteId} />
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-base font-heading font-semibold">Next 7 Days</h2>
        <Button size="sm" variant="outline" onClick={() => adjustment.mutate()} disabled={adjustment.isPending || !query.data || query.isError} className="gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          {adjustment.isPending ? "Adjusting..." : "AI Microadjustment"}
        </Button>
      </div>
      {query.isError && <Alert><AlertTitle>Could not refresh the calendar</AlertTitle><AlertDescription>
        {query.data ? 'Showing the last loaded schedule.' : 'Your schedule is unavailable; empty dates are not confirmed rest days.'}
        <Button variant="outline" size="sm" disabled={query.isFetching} onClick={() => query.refetch()}>Retry calendar</Button>
      </AlertDescription></Alert>}
      {adjustment.isError && <Alert><AlertTitle>Adjustment could not be confirmed</AlertTitle><AlertDescription>
        The saved schedule is being refreshed. Check it before retrying.
        <Button variant="outline" size="sm" onClick={() => query.refetch()}>Refresh schedule</Button>
      </AlertDescription></Alert>}
      {adjustment.isSuccess && <p role="status" className="text-sm text-muted-foreground">{adjustment.data.adjusted?.length ? (query.isError ? 'Adjustment saved, but the schedule could not be refreshed.' : 'Adjustment saved. Showing the refreshed schedule.') : 'No workout changes were applied.'}</p>}
      {!query.data ? (
        <p role="status" className="text-sm text-muted-foreground">{!athleteId ? "Choose an athlete to view the calendar." : query.isError ? "Calendar not loaded." : "Loading calendar..."}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {days.map((day) => {
            const session = sessions.find((s) => s.date === day);
            const factor = session ? (ZONE_TRIMP_FACTOR[session.prescribed_intensity_zone] || 0.8) : 0;
            const estTrimp = session ? Math.round((session.prescribed_duration_minutes || 0) * factor) : 0;
            return (
              <Card key={day}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{moment(day).format("ddd, MMM D")}</CardTitle>
                </CardHeader>
                <CardContent>
                  {session ? (
                    <div className="space-y-1 text-sm">
                      <p className="font-medium capitalize flex items-center gap-1">
                        {session.sport}
                      </p>
                      <p className="text-muted-foreground">{session.prescribed_duration_minutes} min · {session.prescribed_intensity_zone || "-"}</p>
                      <p className="text-muted-foreground">Target TRIMP ~{estTrimp}</p>
                      {session.rationale_text && <p className="text-xs text-muted-foreground">{session.rationale_text}</p>}
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">{session.status}</p>
                      <FeatureGate feature="structured_export" plan={plan} compact>
                        <Button size="sm" variant="outline" onClick={() => downloadWorkoutFile(session)} className="gap-1.5 mt-2 w-full">
                          <Download className="w-3.5 h-3.5" /> Export Workout
                        </Button>
                      </FeatureGate>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Rest day</p>
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