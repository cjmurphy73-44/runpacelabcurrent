import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { downloadWorkoutFile } from "@/services/workoutExport";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import moment from "moment";
import { ChevronLeft, ChevronRight, Download, Sparkles } from "lucide-react";
import { useCoachInjurySignal } from "@/hooks/useCoachInjurySignal";
import CoachHoldCard from "@/components/dashboard/CoachHoldCard";
import { useSubscription } from "@/hooks/useSubscription";
import FeatureGate from "@/components/billing/FeatureGate";
import { loadActiveSchedule } from "@/services/activeSchedule";

const ZONE_TRIMP_FACTOR = { Z1: 0.5, Z2: 0.7, Z3: 0.9, Z4: 1.1, Z5: 1.3 };

export default function TrainingCalendar({ athleteId, currentTsb, startDate, onChangeWeek }) {
  const [adjustError, setAdjustError] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [review, setReview] = useState(null);
  const [adjustStatus, setAdjustStatus] = useState('');
  const injury = useCoachInjurySignal(athleteId);
  const { plan } = useSubscription();

  const today = moment().format("YYYY-MM-DD");
  const days = Array.from({ length: 7 }, (_, i) => moment(startDate).add(i, "days").format("YYYY-MM-DD"));
  const schedule = useQuery({
    queryKey: ["active-schedule", athleteId, startDate],
    queryFn: () => loadActiveSchedule(athleteId, startDate, days[6]),
    retry: false,
  });
  const { plan: activePlan, sessions = [], workoutBySession = {} } = schedule.data ?? {};

  const requestMicroadjustment = async () => {
    setRequesting(true);
    setAdjustError("");
    setAdjustStatus("");
    setReview(null);
    const upcoming = sessions.find((s) => s.status === 'pending' && s.date >= today);
    if (!upcoming) {
      setAdjustError('No upcoming pending workout to review.');
      setRequesting(false);
      return;
    }
    try {
      const response = await base44.functions.invoke('athletePlanReview', {
        action: 'preview', session_id: upcoming.id,
      });
      setReview(response?.data ?? null);
      if (response?.data?.state !== 'review_available') {
        setAdjustStatus(response?.data?.explanation || 'No evidence-supported change is available.');
      }
    } catch (error) {
      setAdjustError(error?.response?.data?.error || 'Could not review the current plan.');
    } finally {
      setRequesting(false);
    }
  };
  const applyReviewedAdjustment = async () => {
    if (!review?.proposal) return;
    setRequesting(true);
    setAdjustError('');
    try {
      const response = await base44.functions.invoke('athletePlanReview', {
        action: 'apply',
        session_id: review.proposal.session_id,
        snapshot: review.proposal.snapshot,
        proposed_duration_minutes: review.proposal.proposed_duration_minutes,
        confirm: 'APPLY_REVIEWED_REDUCTION',
      });
      if (response?.data?.applied !== true) throw new Error('Plan change was not confirmed');
      setReview(null);
      setAdjustStatus('Your reviewed adjustment was applied to one upcoming session.');
      await schedule.refetch();
    } catch (error) {
      setReview(null);
      setAdjustError(error?.response?.data?.error || 'The plan may have changed. Review it again.');
      await schedule.refetch();
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="space-y-4">
      <CoachHoldCard
        injury={injury}
        compact
        hideWhenNone
        swappedLabel="Running days below are replaced by rest or easy cross-training."
      />
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-base font-heading font-semibold">{startDate === today ? "Next 7 days" : `Week of ${moment(startDate).format("MMM D, YYYY")}`}</h2>
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="outline" aria-label="Previous week" onClick={() => onChangeWeek(moment(startDate).subtract(7, "days").format("YYYY-MM-DD"))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => onChangeWeek(today)}>Today</Button>
          <Button size="sm" variant="outline" aria-label="Next week" onClick={() => onChangeWeek(moment(startDate).add(7, "days").format("YYYY-MM-DD"))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
      {activePlan && startDate === today && (
        <FeatureGate feature="adaptive_replan" plan={plan} compact>
          <Button size="sm" variant="outline" onClick={requestMicroadjustment} disabled={requesting} className="gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            {requesting ? "Reviewing…" : "Review plan options"}
          </Button>
        </FeatureGate>
      )}
      {adjustError && <p role="alert" className="text-sm text-destructive">{adjustError}</p>}
      {adjustStatus && <p role="status" className="text-sm text-muted-foreground">{adjustStatus}</p>}
      {review?.proposal && <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Optional session adjustment</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>{review.proposal.date}: {review.proposal.sport}. Duration {review.proposal.old_duration_minutes} min → {review.proposal.proposed_duration_minutes} min. Intensity is unchanged.</p>
          <p className="text-muted-foreground">{review.proposal.rationale}</p>
          <p className="text-xs text-muted-foreground">Based on recorded training evidence. This is optional, not medical advice, and no change occurs until you approve.</p>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" disabled={requesting} onClick={applyReviewedAdjustment}>Approve this change</Button>
            <Button size="sm" variant="outline" disabled={requesting} onClick={() => setReview(null)}>Keep current plan</Button>
          </div>
        </CardContent>
      </Card>}
      {schedule.isPending ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : schedule.isError ? (
        <div className="flex flex-wrap items-center gap-2">
          <p role="alert" className="text-sm text-muted-foreground">Could not load your active schedule.</p>
          <Button size="sm" variant="outline" onClick={() => schedule.refetch()}>Retry</Button>
        </div>
      ) : !activePlan ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-muted-foreground">Create an active plan to fill your calendar.</p>
          <Button asChild size="sm" variant="outline"><Link to="/plan">Training plan</Link></Button>
        </div>
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
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">{session.status}</p>
                      {workoutBySession[session.id] && (
                        <Link className="block text-sm text-primary hover:underline" to={`/workouts/${workoutBySession[session.id]}`}>
                          Review completed workout
                        </Link>
                      )}
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
