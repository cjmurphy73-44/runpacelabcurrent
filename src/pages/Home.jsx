import React, { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import ProfileSetupForm from "@/components/dashboard/ProfileSetupForm";
import FitnessStats from "@/components/dashboard/FitnessStats";
import WorkoutUpload from "@/components/dashboard/WorkoutUpload";
import BulkWorkoutImport from "@/components/dashboard/BulkWorkoutImport";
import RecentWorkouts from "@/components/dashboard/RecentWorkouts";
import CoachMessageFeed from "@/components/dashboard/CoachMessageFeed";
import WeeklySummary from "@/components/dashboard/WeeklySummary";
import TrainingCalendar from "@/components/dashboard/TrainingCalendar";
import PhysiologyLab from "@/components/dashboard/PhysiologyLab";
import PersonalBests from "@/components/dashboard/PersonalBests";
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
import OcrDropzone from "@/components/imports/OcrDropzone";
import RaceStrategyPlanner from "@/components/dashboard/RaceStrategyPlanner";
import WipWrapper from "@/components/common/WipWrapper";
import { FitnessProvider } from "@/context/FitnessContext";
import { useUIPreferences } from "@/context/UIPreferencesContext";
import DashboardRangeControls from "@/components/dashboard/DashboardRangeControls";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [athlete, setAthlete] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [workouts, setWorkouts] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loadTimelineWorkouts, setLoadTimelineWorkouts] = useState([]);
  const [plannedWorkouts, setPlannedWorkouts] = useState([]);
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
    return <div className="text-center py-20 text-muted-foreground">Loading your dashboard...</div>;
  }

  if (!athlete) {
    return (
      <div className="py-8">
        <ProfileSetupForm onCreated={(profile) => setAthlete(profile)} />
      </div>
    );
  }

  return (
    <FitnessProvider athleteId={athlete.id}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="dashboard">Overview</TabsTrigger>
          <TabsTrigger value="calendar">Training Calendar</TabsTrigger>
          <TabsTrigger value="physiology">Physiology Lab</TabsTrigger>
          <TabsTrigger value="bests">Personal Bests</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          {/* Pro-Athlete Obsidian — top metric banner */}
          <DashboardMetricBanner athlete={athlete} workouts={loadTimelineWorkouts} />

          {/* Hero — Performance Management Chart (synced obsidian PMC) */}
          <LoadFatigueChart completedSessions={loadTimelineWorkouts} plannedWorkouts={plannedWorkouts} />

          {/* Action grid — OCR import, recent sessions, race strategy lab preview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <OcrDropzone athleteId={athlete.id} onSaved={() => loadAthleteData(athlete.id)} />
            <RecentWorkouts workouts={workouts} athlete={athlete} />
            <WipWrapper isWip featureName="AI Race Pacing Strategy — Coming Soon">
              <RaceStrategyPlanner athleteId={athlete.id} />
            </WipWrapper>
          </div>

          {/* Execute + status */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <TodaySessionCard athleteId={athlete.id} />
            </div>
            <StatusGauges athlete={athlete} />
          </div>

          {/* Tier 2 — Horizon */}
          <HorizonStrip athleteId={athlete.id} />

          <HolisticFactorsLog athleteId={athlete.id} />

          {showDeepMetrics && (
            <div className="space-y-6">
              <DashboardRangeControls />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <FitnessStats athlete={athlete} />
                </div>
                <CoachAdvice />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <AutonomicStressCard />
                  <SleepEnergyCard />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <ReadinessScoreCard />
                </div>
              </div>
              <BaselineHistoryMatrix athleteId={athlete.id} />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <WeeklySummary />
              <RecoveryLab athleteId={athlete.id} />
              <DataCommandCenter athleteId={athlete.id} />
            </div>
            <div className="space-y-6">
              <WorkoutUpload athleteId={athlete.id} onUploaded={() => loadAthleteData(athlete.id)} />
              <BulkWorkoutImport athleteId={athlete.id} onUploaded={() => loadAthleteData(athlete.id)} />
              <CoachMessageFeed messages={messages} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="calendar">
          <TrainingCalendar athleteId={athlete.id} currentTsb={athlete.current_tsb} />
        </TabsContent>

        <TabsContent value="physiology">
          <PhysiologyLab athlete={athlete} />
        </TabsContent>

        <TabsContent value="bests">
          <PersonalBests />
        </TabsContent>
      </Tabs>
    </FitnessProvider>
  );
}