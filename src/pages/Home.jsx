import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { loadActiveSchedule } from "@/services/activeSchedule";
import moment from "moment";
import OnboardingFlow from "@/components/dashboard/OnboardingFlow";
import { ensureProfileLinked } from "@/lib/profileLinkage";
import FitnessStats from "@/components/dashboard/FitnessStats";
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
import WeeklyVolumeLine from "@/components/dashboard/WeeklyVolumeLine";
import AthleteHistoryInsights from "@/components/dashboard/AthleteHistoryInsights";
import DashboardGreeting from "@/components/dashboard/DashboardGreeting";

import HorizonStrip from "@/components/dashboard/HorizonStrip";
import LoadFatigueChart from "@/components/dashboard/LoadFatigueChart";

import DashboardRangeControls from "@/components/dashboard/DashboardRangeControls";
import { FitnessProvider } from "@/context/FitnessContext";
import { useUIPreferences } from "@/context/UIPreferencesContext";
import { useAuth } from "@/lib/AuthContext";
import CollapsibleSection from "@/components/ui/CollapsibleSection";
import PageShell from "@/components/layout/PageShell";
import SectionHeading from "@/components/layout/SectionHeading";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import WidgetBoundary from "@/components/common/WidgetBoundary";
import WorkoutLogWizard from "@/components/workout/WorkoutLogWizard";
import CalibrationMeter from "@/components/dashboard/CalibrationMeter";
import FirstDataPanel from "@/components/onboarding/FirstDataPanel";
import PlannedActualReconciliation from "@/components/dashboard/PlannedActualReconciliation";
import CoachBriefing from "@/components/dashboard/CoachBriefing";
import PhysiologyStrip from "@/components/dashboard/PhysiologyStrip";
import WearableSyncBar from "@/components/dashboard/WearableSyncBar";
import AnomalyAlertBanner from "@/components/dashboard/AnomalyAlertBanner";
import AISynthesisCard from "@/components/dashboard/AISynthesisCard";
import { Sun, TrendingUp, Activity, MessageCircle, HeartPulse, ArrowRight, Plus, Upload, LogIn } from "lucide-react";

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [athlete, setAthlete] = useState(null);
  const [profileExists, setProfileExists] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [workouts, setWorkouts] = useState([]);
  const [refreshIssue, setRefreshIssue] = useState(false);
  const [messages, setMessages] = useState([]);
  const [loadTimelineWorkouts, setLoadTimelineWorkouts] = useState([]);
  const [schedule, setSchedule] = useState(null);
  const [manualOpen, setManualOpen] = useState(false);

  const trackWorkoutIngested = () => {
    try { base44.analytics.track({ eventName: "workout_ingested" }); } catch {}
  };
  const { isGeek } = useUIPreferences();
  const { user, redirectToLogin } = useAuth();

  const loadAthleteData = useCallback(async (athleteId, initialProfile) => {
    const [freshAthlete, recentWorkouts, [messageResult, planResult]] = await Promise.all([
      initialProfile ?? base44.entities.AthleteProfile.get(athleteId),
      base44.entities.WorkoutSession.filter({ athlete_id: athleteId }, "-date", 60, 0, [
        "id", "date", "sport", "duration_minutes", "distance_km", "avg_hr", "session_trimp", "session_tss", "load_source",
      ]),
      Promise.allSettled([
        base44.entities.CoachMessage.filter({ athlete_id: athleteId }, "-created_date", 10),
        loadActiveSchedule(athleteId, moment().format("YYYY-MM-DD"), moment().add(7, "days").format("YYYY-MM-DD")),
      ]),
    ]);
    setAthlete(freshAthlete);
    setWorkouts(recentWorkouts.slice(0, 5));
    if (messageResult.status === "fulfilled") setMessages(messageResult.value);
    setRefreshIssue(messageResult.status === "rejected" || planResult.status === "rejected");
    setLoadTimelineWorkouts(recentWorkouts);
    setSchedule(planResult.status === "fulfilled" ? planResult.value : null);
  }, []);

  const refreshDashboard = useCallback(async (athleteId) => {
    try {
      await loadAthleteData(athleteId);
    } catch {
      setRefreshIssue(true);
    }
  }, [loadAthleteData]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!user) return; // signed-out, show the sign-in prompt below
        // Prefer the server-verified profile, then look up profiles owned by this user.
        let profile = null;
        const linkedId = user.data?.verified_athlete_profile_id ?? user.verified_athlete_profile_id;
        if (linkedId) {
          try {
            profile = await base44.entities.AthleteProfile.get(linkedId);
          } catch (err) {
            console.warn("Linked athlete_profile_id not resolvable:", err);
            profile = null;
          }
        }
        if (!profile) {
          const profiles = await base44.entities.AthleteProfile.filter({ created_by_id: user.id }, "-updated_date", 50);
          if (cancelled) return;
          profile = profiles[0];
        }
        if (profile) {
          setProfileExists(true);
          await ensureProfileLinked(user, profile);
          await loadAthleteData(profile.id, profile);
        }
        // No profile found is NOT an error, it means onboarding is required.
        // Only a thrown query counts as a loadError (transient RLS/network blip),
        // which must show a retry, not the onboarding wall (avoids duplicate creation).
      } catch (err) {
        console.error("Dashboard data load failed:", err);
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [loadAthleteData, user]);

  if (loading) {
    return (
      <PageShell maxWidth="max-w-7xl">
        <div className="space-y-6">
          <div className="h-9 w-72 rounded-md bg-muted animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => <div key={i} className="h-28 rounded-lg border border-border bg-card animate-pulse" />)}
          </div>
          <div className="h-64 rounded-lg border border-border bg-card animate-pulse" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="h-40 rounded-lg border border-border bg-card animate-pulse" />
            <div className="h-40 rounded-lg border border-border bg-card animate-pulse" />
          </div>
        </div>
      </PageShell>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center py-20">
        <Card className="max-w-sm text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-accent flex items-center justify-center">
              <LogIn className="w-6 h-6 text-accent-foreground" />
            </div>
            <h2 className="text-lg font-heading font-semibold">Sign in to view your dashboard</h2>
            <p className="text-sm text-muted-foreground">
              Your training, recovery and readiness insights live here. Sign in to load your athlete profile.
            </p>
            <Button onClick={redirectToLogin} className="gap-2">
              <LogIn className="w-4 h-4" /> Sign in
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!athlete) {
    if (loadError) {
      // The profile query itself failed (transient RLS/network blip). Showing onboarding
      // here would let the user create a duplicate profile, so offer a retry instead.
      return (
        <div className="py-8 max-w-md mx-auto">
          <Card className="border-dashed text-center">
            <CardContent className="pt-8 pb-8 space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-accent flex items-center justify-center">
                <Activity className="w-6 h-6 text-accent-foreground" />
              </div>
              <h2 className="text-lg font-heading font-semibold">Couldn't reach your profile</h2>
              <p className="text-sm text-muted-foreground">We hit a snag loading your data. This is usually momentary, try again.</p>
              <Button onClick={() => window.location.reload()}>Retry</Button>
            </CardContent>
          </Card>
        </div>
      );
    }
    if (profileExists) {
      // A profile exists but failed to load (transient RLS/network error). Show a retry
      // instead of the onboarding wall, the wall would let the user create a duplicate.
      return (
        <div className="py-8 max-w-md mx-auto">
          <Card className="border-dashed text-center">
            <CardContent className="pt-8 pb-8 space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-accent flex items-center justify-center">
                <Activity className="w-6 h-6 text-accent-foreground" />
              </div>
              <h2 className="text-lg font-heading font-semibold">Couldn't load your profile</h2>
              <p className="text-sm text-muted-foreground">Your athlete profile exists but the dashboard hit a snag loading it. This is usually a momentary blip, try again.</p>
              <Button onClick={() => window.location.reload()}>Retry</Button>
            </CardContent>
          </Card>
        </div>
      );
    }
    return (
      <div className="py-8">
        <OnboardingFlow onCreated={(profile) => { setProfileExists(true); setAthlete(profile); refreshDashboard(profile.id); }} />
      </div>
    );
  }

  const isEmpty = workouts.length === 0;

  return (
    <FitnessProvider athleteId={athlete.id}>
      <PageShell maxWidth="max-w-7xl">
        {refreshIssue && (
          <div role="status" className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm">
            Some dashboard data could not be refreshed.
            <Button size="sm" variant="outline" onClick={() => refreshDashboard(athlete.id)}>Retry refresh</Button>
          </div>
        )}
        {isEmpty && !schedule?.plan ? (
          <section className="space-y-6">
            <FirstDataPanel
              athlete={athlete}
              onAddManual={() => setManualOpen(true)}
              onRefresh={() => refreshDashboard(athlete.id)}
            />
          </section>
        ) : (
          <>
          <DashboardGreeting athlete={athlete} />
          <div className="space-y-6">
        <AnomalyAlertBanner />
        <section className="space-y-3">
          <SectionHeading title="Today" icon={Sun} action={
            <Link to="/recovery" className="inline-flex min-h-11 items-center gap-1 text-sm font-medium hover:underline">
              Recovery <ArrowRight className="h-4 w-4 text-primary" aria-hidden="true" />
            </Link>
          } />
          <WidgetBoundary name="Today's session"><TodaySessionCard athlete={athlete} schedule={schedule} /></WidgetBoundary>
          <WidgetBoundary name="Wearable sync"><WearableSyncBar onSynced={() => refreshDashboard(athlete.id)} /></WidgetBoundary>
        </section>

        <section className="space-y-3">
          <SectionHeading
            title="Recent workouts"
            icon={Activity}
            action={
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setManualOpen(true)} className="min-h-11">
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Log workout
                </Button>
                <Button asChild variant="outline" size="sm" className="min-h-11">
                  <Link to="/import#workout-files"><Upload aria-hidden="true" /> Import file</Link>
                </Button>
              </div>
            }
          />
          <WidgetBoundary name="Recent workouts"><RecentWorkouts workouts={workouts} /></WidgetBoundary>
          <WidgetBoundary name="Training context"><AthleteHistoryInsights workouts={loadTimelineWorkouts} /></WidgetBoundary>
        </section>

        <section className="space-y-3">
          <SectionHeading title="Coaching" icon={MessageCircle} action={
            <Link to="/coach" className="inline-flex min-h-11 items-center gap-1 text-sm font-medium hover:underline">
              Open coach <ArrowRight className="h-4 w-4 text-primary" aria-hidden="true" />
            </Link>
          } />
          <WidgetBoundary name="Coach briefing"><CoachBriefing athlete={athlete} /></WidgetBoundary>
        </section>

        {/* 4, Coach notes (collapsible) */}
        <CollapsibleSection
          title="Coach notes"
          subtitle="Advice & AI messages tuned to your trend"
          icon={MessageCircle}
          deep
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <WidgetBoundary name="Coach advice"><CoachAdvice /></WidgetBoundary>
            <WidgetBoundary name="Coach message feed"><CoachMessageFeed messages={messages} /></WidgetBoundary>
          </div>
        </CollapsibleSection>

        {/* 5, Load & Form (deep, collapses in Simplified mode) */}
        <CollapsibleSection
          title={isGeek ? "Load & Form (CTL / ATL / TSB)" : "Fitness & freshness over time"}
          subtitle={isGeek ? "Chronic, acute and balance of training stress" : "How fit and how fresh you are"}
          icon={TrendingUp}
          deep
        >
          <WidgetBoundary name="Weekly volume"><WeeklyVolumeLine athleteId={athlete.id} /></WidgetBoundary>
          <WidgetBoundary name="Load & fatigue chart"><LoadFatigueChart completedSessions={loadTimelineWorkouts} plannedWorkouts={schedule?.sessions ?? []} /></WidgetBoundary>
          <WidgetBoundary name="Horizon strip"><HorizonStrip athleteId={athlete.id} /></WidgetBoundary>
        </CollapsibleSection>

        {/* 6, Planned vs. Actual (collapsible) */}
        <CollapsibleSection
          title="Planned vs. Actual"
          subtitle="Reconciliation across your recent sessions"
          deep
        >
          <WidgetBoundary name="Planned vs actual">
            <PlannedActualReconciliation athleteId={athlete.id} activePlanId={schedule?.plan?.id} onScheduleChanged={refreshDashboard} />
          </WidgetBoundary>
        </CollapsibleSection>

        {/* 7, Recovery & Readiness (collapsible) */}
        <CollapsibleSection
          title="Recovery & Readiness"
          subtitle={isGeek ? "Sleep, HRV, autonomic stress & lifestyle" : "Sleep, recovery signal & how you feel"}
          icon={HeartPulse}
          deep
        >
          <WidgetBoundary name="Physiology strip"><PhysiologyStrip athlete={athlete} /></WidgetBoundary>
          <WidgetBoundary name="Calibration meter"><CalibrationMeter athlete={athlete} athleteId={athlete.id} /></WidgetBoundary>
          <WidgetBoundary name="AI synthesis"><AISynthesisCard athleteId={athlete.id} /></WidgetBoundary>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <WidgetBoundary name="Readiness score"><ReadinessScoreCard /></WidgetBoundary>
            <WidgetBoundary name="Sleep & energy"><SleepEnergyCard /></WidgetBoundary>
            <WidgetBoundary name="Autonomic stress"><AutonomicStressCard /></WidgetBoundary>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <WidgetBoundary name="Recovery lab"><RecoveryLab athleteId={athlete.id} /></WidgetBoundary>
            <WidgetBoundary name="Holistic factors"><HolisticFactorsLog athleteId={athlete.id} /></WidgetBoundary>
          </div>
        </CollapsibleSection>

          </div>
          </>
        )}
        {/* Advanced metrics (Geek mode only) */}
        {isGeek && !isEmpty && (
          <Card className="mt-8">
            <CardContent className="pt-6">
              <Accordion type="single" collapsible defaultValue="advanced">
                <AccordionItem value="advanced" className="border-0">
                  <AccordionTrigger className="text-base font-heading font-semibold">Advanced metrics</AccordionTrigger>
                  <AccordionContent className="space-y-8 pt-4">
                    <WidgetBoundary name="Dashboard range controls"><DashboardRangeControls /></WidgetBoundary>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="lg:col-span-2">
                        <WidgetBoundary name="Fitness stats"><FitnessStats athlete={athlete} /></WidgetBoundary>
                      </div>
                      <WidgetBoundary name="Baseline history"><BaselineHistoryMatrix athleteId={athlete.id} /></WidgetBoundary>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <WidgetBoundary name="Weekly summary"><WeeklySummary /></WidgetBoundary>
                      <WidgetBoundary name="Data command center"><DataCommandCenter athleteId={athlete.id} /></WidgetBoundary>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        )}
      </PageShell>
      <WorkoutLogWizard
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        athleteId={athlete.id}
        onSaved={() => { trackWorkoutIngested(); refreshDashboard(athlete.id); }}
      />
    </FitnessProvider>
  );
}
