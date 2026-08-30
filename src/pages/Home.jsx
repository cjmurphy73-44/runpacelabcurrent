import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import OnboardingFlow from "@/components/dashboard/OnboardingFlow";
import FitnessStats from "@/components/dashboard/FitnessStats";
import OcrDropzone from "@/components/imports/OcrDropzone";
import RecentWorkouts from "@/components/dashboard/RecentWorkouts";
import CoachMessageFeed from "@/components/dashboard/CoachMessageFeed";
import WeeklySummary from "@/components/dashboard/WeeklySummary";
import RecoveryLab from "@/components/dashboard/RecoveryLab";
import DataCommandCenter from "@/components/dashboard/DataCommandCenter";
import CoachAdvice from "@/components/dashboard/CoachAdvice";
import BaselineHistoryMatrix from "@/components/dashboard/BaselineHistoryMatrix";
import ReadinessScoreCard from "@/components/dashboard/ReadinessScoreCard";
import AutonomicStressCard from "@/components/dashboard/AutonomicStressCard";
import SleepEnergyCard from "@/components/dashboard/SleepEnergyCard";
import HolisticFactorsLog from "@/components/dashboard/HolisticFactorsLog";
import TodaySessionCard from "@/components/dashboard/TodaySessionCard";
import StatusGauges from "@/components/dashboard/StatusGauges";
import HorizonStrip from "@/components/dashboard/HorizonStrip";
import LoadFatigueChart from "@/components/dashboard/LoadFatigueChart";
import DashboardMetricBanner from "@/components/dashboard/DashboardMetricBanner";
import DashboardRangeControls from "@/components/dashboard/DashboardRangeControls";
import { FitnessProvider } from "@/context/FitnessContext";
import { useUIPreferences } from "@/context/UIPreferencesContext";
import PageShell from "@/components/layout/PageShell";
import SectionHeading from "@/components/layout/SectionHeading";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import WipWrapper from "@/components/common/WipWrapper";
import ManualWorkoutModal from "@/components/workout/ManualWorkoutModal";
import OnboardingEmptyState from "@/components/dashboard/OnboardingEmptyState";
import PlannedActualReconciliation from "@/components/dashboard/PlannedActualReconciliation";
import PhysiologyStrip from "@/components/dashboard/PhysiologyStrip";
import { Sun, TrendingUp, Activity, MessageCircle, HeartPulse, ArrowRight, Plus } from "lucide-react";

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [athlete, setAthlete] = useState(null);
  const [workouts, setWorkouts] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loadTimelineWorkouts, setLoadTimelineWorkouts] = useState([]);
  const [plannedWorkouts, setPlannedWorkouts] = useState([]);
  const [manualOpen, setManualOpen] = useState(false);
  const { showDeepMetrics } = useUIPreferences();

  const loadAthleteData = useCallback(async (athleteId) => {
    const [freshAthlete, workoutRows, messageRows, recentWorkouts, planSessions] = await Promise.all([
      base44.entities.AthleteProfile.get(athleteId),
      base44.entities.WorkoutSession.filter({ athlete_id: athleteId }, "-date", 10),
      base44.entities.CoachMessage.filter({ athlete_id: athleteId }, "-created_date", 10),
      base44.entities.WorkoutSession.filter({ athlete_id: athleteId }, "-date", 60),
      base44.entities.TrainingPlanSession.filter({ athlete_id: athleteId }, "-date", 60),
    ]);
    setAthlete(freshAthlete);
    setWorkouts(workoutRows);
    setMessages(messageRows);
    setLoadTimelineWorkouts(recentWorkouts);
    const todayKey = new Date().toISOString().split("T")[0];
    const in7Days = new Date();
    in7Days.setDate(in7Days.getDate() + 7);
    const in7DaysKey = in7Days.toISOString().split("T")[0];
    setPlannedWorkouts(planSessions.filter((p) => p.date >= todayKey && p.date <= in7DaysKey));
  }, []);

  useEffect(() => {
    (async () => {
      const user = await base44.auth.me();
      const profiles = await base44.entities.AthleteProfile.filter({ created_by_id: user.id });
      if (profiles.length > 0) {
        await loadAthleteData(profiles[0].id);
      }
      setLoading(false);
    })();
  }, [loadAthleteData]);

  if (loading) {
    return <div className="text-center py-20 text-muted-foreground">Loading your dashboard…</div>;
  }

  if (!athlete) {
    return (
      <div className="py-8">
        <OnboardingFlow onCreated={(profile) => setAthlete(profile)} />
      </div>
    );
  }

  const isEmpty = workouts.length === 0;

  return (
    <FitnessProvider athleteId={athlete.id}>
      <PageShell maxWidth="max-w-7xl">
        {isEmpty ? (
          <section className="space-y-6">
            <SectionHeading
              title="Welcome"
              description="You're set up — now let's log your first session and watch the engine respond."
              icon={Sun}
            />
            <DashboardMetricBanner athlete={athlete} workouts={loadTimelineWorkouts} />
            <OnboardingEmptyState athlete={athlete} onAddManual={() => setManualOpen(true)} />
          </section>
        ) : (
          <>
        {/* 1 — Today's snapshot */}
        <section className="space-y-4">
          <SectionHeading index="01" title="Today's snapshot" description="Your form, readiness and prescribed session for today." icon={Sun} />
          <DashboardMetricBanner athlete={athlete} workouts={loadTimelineWorkouts} />
          <PhysiologyStrip athlete={athlete} />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <TodaySessionCard athleteId={athlete.id} />
            </div>
            <StatusGauges athlete={athlete} />
          </div>
        </section>

        {/* 2 — Load & Form */}
        <section className="space-y-4">
          <SectionHeading index="02" title="Load & Form" description="Fitness, fatigue and the balance between them over time." icon={TrendingUp} />
          <LoadFatigueChart completedSessions={loadTimelineWorkouts} plannedWorkouts={plannedWorkouts} />
          <HorizonStrip athleteId={athlete.id} />
        </section>

        {/* 3 — Recent activity */}
        <section className="space-y-4">
          <SectionHeading
            index="03"
            title="Recent activity"
            description="Drop a workout screenshot or review your latest sessions."
            icon={Activity}
            action={
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setManualOpen(true)} className="whitespace-nowrap">
                  <Plus className="w-3.5 h-3.5" /> Manual
                </Button>
                <Link to="/import" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline whitespace-nowrap">
                  All import options <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            }
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <OcrDropzone athleteId={athlete.id} onSaved={() => loadAthleteData(athlete.id)} />
            <RecentWorkouts workouts={workouts} athlete={athlete} />
          </div>
        </section>

        {/* 3b — Planned vs. Actual */}
        <section className="space-y-4">
          <PlannedActualReconciliation athleteId={athlete.id} />
        </section>

        {/* 4 — Coach notes */}
        <section className="space-y-4">
          <SectionHeading index="04" title="Coach notes" description="Automated briefings and AI messages tuned to your recent trend." icon={MessageCircle} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <CoachAdvice />
            <CoachMessageFeed messages={messages} />
          </div>
        </section>

        {/* 5 — Recovery & Readiness */}
        <section className="space-y-4">
          <SectionHeading index="05" title="Recovery & Readiness" description="Sleep, HRV, autonomic stress and lifestyle context." icon={HeartPulse} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <WipWrapper isWip featureName="Readiness Score">
              <ReadinessScoreCard />
            </WipWrapper>
            <WipWrapper isWip featureName="Sleep & Energy">
              <SleepEnergyCard />
            </WipWrapper>
            <WipWrapper isWip featureName="Autonomic Stress">
              <AutonomicStressCard />
            </WipWrapper>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <WipWrapper isWip featureName="Recovery Lab">
              <RecoveryLab athleteId={athlete.id} />
            </WipWrapper>
            <WipWrapper isWip featureName="Holistic Factors">
              <HolisticFactorsLog athleteId={athlete.id} />
            </WipWrapper>
          </div>
        </section>

          </>
        )}
        {/* 6 — Advanced metrics (geek mode only, collapsible) */}
        {showDeepMetrics && !isEmpty && (
          <Card>
            <CardContent className="pt-6">
              <Accordion type="single" collapsible defaultValue="advanced">
                <AccordionItem value="advanced" className="border-0">
                  <AccordionTrigger className="text-base font-heading font-semibold">Advanced metrics</AccordionTrigger>
                  <AccordionContent className="space-y-8 pt-4">
                    <DashboardRangeControls />
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="lg:col-span-2">
                        <FitnessStats athlete={athlete} />
                      </div>
                      <BaselineHistoryMatrix athleteId={athlete.id} />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <WeeklySummary />
                      <DataCommandCenter athleteId={athlete.id} />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        )}
      </PageShell>
      <ManualWorkoutModal
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        athleteId={athlete.id}
        onSaved={() => loadAthleteData(athlete.id)}
      />
    </FitnessProvider>
  );
}