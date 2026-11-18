import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, HeartPulse, History } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import WidgetBoundary from "@/components/common/WidgetBoundary";
import TodaySessionCard from "@/components/dashboard/TodaySessionCard";
import DashboardGreeting from "@/components/dashboard/DashboardGreeting";
import ReadinessScoreCard from "@/components/dashboard/ReadinessScoreCard";
import TodayDecisionSummary from "@/components/dashboard/TodayDecisionSummary";
import CoachHoldCard from "@/components/dashboard/CoachHoldCard";
import WorkoutDetailModal from "@/components/workout/WorkoutDetailModal";
import { useCoachInjurySignal } from "@/hooks/useCoachInjurySignal";

// Today's Session owns coaching status on its tab. Keep the same safety card
// visible on the other tabs, including loading/unavailable states. A readiness
// score or a historical workout never takes the place of current coach guidance.
function CurrentCoachStatus({ athleteId }) {
  const injury = useCoachInjurySignal(athleteId);
  return <CoachHoldCard injury={injury} hideWhenNone />;
}

export default function HomeTrainingWorkspace({ athlete, workouts = [], onWorkoutChanged }) {
  const [tab, setTab] = useState("today");
  const latest = [...workouts].sort((a, b) => (b.date || "").localeCompare(a.date || ""))[0];

  return (
    <section aria-label="Daily training" className="min-w-0 space-y-4">
      <DashboardGreeting athlete={athlete} />
      <WidgetBoundary name="Daily decision summary"><TodayDecisionSummary athlete={athlete} workouts={workouts} /></WidgetBoundary>

      <Tabs value={tab} onValueChange={setTab} className="min-w-0 space-y-4">
        <TabsList aria-label="Your daily training" className="grid h-auto w-full grid-cols-3 gap-1 p-1">
          <TabsTrigger value="today" className="min-h-[44px] min-w-0 gap-1.5 px-1 text-xs sm:text-sm">
            <CalendarDays aria-hidden="true" className="hidden sm:block w-4 h-4 shrink-0" /> Today
          </TabsTrigger>
          <TabsTrigger value="readiness" className="min-h-[44px] min-w-0 gap-1.5 px-1 text-xs sm:text-sm">
            <HeartPulse aria-hidden="true" className="hidden sm:block w-4 h-4 shrink-0" /> Readiness
          </TabsTrigger>
          <TabsTrigger value="workout" className="min-h-[44px] min-w-0 gap-1.5 px-1 text-xs sm:text-sm">
            <History aria-hidden="true" className="hidden sm:block w-4 h-4 shrink-0" /> Last workout
          </TabsTrigger>
        </TabsList>

        {tab !== "today" && (
          <WidgetBoundary name="Current coaching status"><CurrentCoachStatus athleteId={athlete.id} /></WidgetBoundary>
        )}

        <TabsContent value="today" className="space-y-3">
          <WidgetBoundary name="Today's session"><TodaySessionCard athleteId={athlete.id} /></WidgetBoundary>
          <Button asChild variant="outline" className="min-h-[44px] w-full sm:w-auto">
            <Link to="/plan">View training plan <ArrowRight aria-hidden="true" className="ml-2 w-4 h-4" /></Link>
          </Button>
        </TabsContent>

        <TabsContent value="readiness" className="space-y-3">
          <div className="rounded-md border border-border bg-card px-4 py-3 text-sm" role="note">
            <p className="font-medium">Training form (TSB)</p>
            {typeof athlete?.current_tsb === "number" && Number.isFinite(athlete.current_tsb) ? (
              <p className="text-muted-foreground">{athlete.current_tsb > 0 ? "+" : ""}{athlete.current_tsb.toFixed(1)} training-load balance. This reflects recent versus longer-term training load, not medical or coach clearance.</p>
            ) : (
              <p className="text-muted-foreground">Form unavailable until sufficient training-load data is recorded.</p>
            )}
          </div>
          <WidgetBoundary name="Readiness score"><ReadinessScoreCard /></WidgetBoundary>
          <Button asChild variant="outline" className="min-h-[44px] w-full sm:w-auto">
            <Link to="/recovery">Explore recovery <ArrowRight aria-hidden="true" className="ml-2 w-4 h-4" /></Link>
          </Button>
        </TabsContent>

        <TabsContent value="workout" className="space-y-3">
          <Card className="min-w-0">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-heading">Last saved workout</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {latest ? (
                <>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{latest.date}</p>
                    <p className="text-2xl font-heading font-bold capitalize break-words">{latest.sport}</p>
                    <p className="text-sm text-muted-foreground">
                      {latest.duration_minutes ? `${latest.duration_minutes} min` : "Duration unavailable"}
                      {latest.distance_km ? ` · ${latest.distance_km} km` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">Review the saved metrics, recording coverage and training interpretation.</p>
                  </div>
                  <WorkoutDetailModal workout={latest} athlete={athlete} onChanged={onWorkoutChanged}>
                    <Button className="min-h-[44px] w-full sm:w-auto">Review last workout <ArrowRight aria-hidden="true" className="ml-2 w-4 h-4" /></Button>
                  </WorkoutDetailModal>
                </>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-medium">No saved workouts yet</p>
                  <p className="text-sm text-muted-foreground">Connect your watch to bring your workouts here. Original FIT upload is available as a recovery option.</p>
                  <Button asChild className="min-h-[44px] w-full sm:w-auto"><Link to="/settings">Connect a watch</Link></Button>
                </div>
              )}
            </CardContent>
          </Card>
          <Button asChild variant="outline" className="min-h-[44px] w-full sm:w-auto">
            <Link to="/workouts">All workouts <ArrowRight aria-hidden="true" className="ml-2 w-4 h-4" /></Link>
          </Button>
        </TabsContent>
      </Tabs>
    </section>
  );
}
