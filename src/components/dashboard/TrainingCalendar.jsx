import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { downloadWorkoutFile } from "@/services/workoutExport";
import TrainingCalendarDay from "@/components/trainingplan/TrainingCalendarDay";
import { Button } from "@/components/ui/button";
import moment from "moment";
import { Sparkles } from "lucide-react";
import { useCoachInjurySignal } from "@/hooks/useCoachInjurySignal";
import CoachHoldCard from "@/components/dashboard/CoachHoldCard";
import CalendarSyncModule from "@/components/dashboard/CalendarSyncModule";
import { useSubscription } from "@/hooks/useSubscription";

// Remount on account/athlete changes so request and action state never crosses
// identities. Query keys also keep cached plan data scoped to both identities.
export default function TrainingCalendar(props) {
  const { user } = useAuth();
  return <TrainingCalendarContent key={`${user?.id || "signed-out"}:${props.athleteId || "none"}`} {...props} userId={user?.id} />;
}

function TrainingCalendarContent({ athleteId, currentTsb, userId }) {
  const injury = useCoachInjurySignal(athleteId);
  const { plan } = useSubscription();
  const queryClient = useQueryClient();
  const [requesting, setRequesting] = useState(false);
  const [adjustmentMessage, setAdjustmentMessage] = useState(null);
  const today = moment().format("YYYY-MM-DD");
  const prefix = ["athlete-plan", userId, athleteId];
  const query = useQuery({
    queryKey: [...prefix, "week", today],
    enabled: Boolean(userId && athleteId),
    retry: false,
    queryFn: async () => {
      const all = await base44.entities.TrainingPlanSession.filter({ athlete_id: athleteId });
      if (!Array.isArray(all)) throw new Error("Calendar response is not a session list");
      const start = moment(today).startOf("day");
      const end = moment(today).add(6, "days").endOf("day");
      return all.filter(session => moment(session?.date).isBetween(start, end, null, "[]"));
    },
  });
  // Stale data can be shown for the same identity, but may not be exported as
  // a current plan or used as the basis for a new adjustment.
  const sessions = Array.isArray(query.data) ? query.data : [];
  const verified = Array.isArray(query.data) && !query.isError;
  const loading = query.isPending && query.isFetching;
  const unavailable = !userId || !athleteId || (query.isError && !query.data);
  const days = Array.from({ length: 7 }, (_, i) => moment(today).add(i, "days").format("YYYY-MM-DD"));

  const requestMicroadjustment = async () => {
    if (requesting || !verified || query.isFetching) return;
    setRequesting(true);
    setAdjustmentMessage(null);
    let result = null;
    try {
      const response = await base44.functions.invoke("requestMicroadjustment", {
        athlete_id: athleteId, current_tsb: currentTsb,
      });
      if (response?.data?.success !== true || !Array.isArray(response.data.adjusted)) {
        throw new Error("Adjustment was not confirmed");
      }
      result = response.data;
    } catch {
      setAdjustmentMessage("Adjustment could not be confirmed. Check the refreshed schedule before retrying.");
    } finally {
      // Mark other views (e.g. Today) stale without starting unrelated reads.
      await queryClient.invalidateQueries({ queryKey: prefix, refetchType: "none" });
      const refresh = await query.refetch();
      if (result && refresh.isSuccess && Array.isArray(refresh.data)) {
        setAdjustmentMessage(result.adjusted.length
          ? "Adjustment confirmed. Showing the refreshed schedule."
          : "No changes were applied to your schedule.");
      } else if (result) {
        setAdjustmentMessage("Adjustment response received, but schedule refresh failed. Retry calendar before making another change.");
      }
      setRequesting(false);
    }
  };

  return (
    <div className="space-y-4">
      <CoachHoldCard
        injury={injury} compact hideWhenNone
        swappedLabel="Running days below are replaced by rest or easy cross-training."
      />
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-base font-heading font-semibold">Next 7 Days</h2>
        <Button type="button" size="sm" variant="outline" onClick={requestMicroadjustment}
          disabled={requesting || !verified || query.isFetching} className="gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          {requesting ? "Adjusting…" : "AI Microadjustment"}
        </Button>
      </div>
      {adjustmentMessage && <p role="status" className="text-sm text-muted-foreground">{adjustmentMessage}</p>}
      {query.isError && (
        <div role="alert" className="rounded-md border border-destructive/30 p-3 space-y-2">
          <p className="text-sm">{query.data
            ? "Could not refresh the calendar. Showing the last loaded schedule, not a confirmed current plan."
            : "Could not load the training calendar. Rest days are not confirmed."}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => query.refetch()}
            disabled={query.isFetching}>Retry calendar</Button>
        </div>
      )}
      {!userId && <p role="status" className="text-sm">Sign in to view your scheduled training.</p>}
      {verified && !query.isFetching && sessions.length > 0 && (
        <CalendarSyncModule workouts={sessions.filter(session =>
          !(injury.level === "hold" && session.sport?.toLowerCase().startsWith("run")))} />
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {days.map(date => (
          <TrainingCalendarDay
            key={date} date={date} sessions={sessions}
            loading={loading} failed={unavailable || (query.isError && !query.data)}
            stale={query.isError && Array.isArray(query.data)}
            injury={injury} plan={plan}
            onExport={verified && !query.isFetching ? downloadWorkoutFile : undefined}
          />
        ))}
      </div>
    </div>
  );
}
