import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import OnboardingFlow from "@/components/dashboard/OnboardingFlow";
import { ensureProfileLinked } from "@/lib/profileLinkage";
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
import WipWrapper from "@/components/common/WipWrapper";
import WidgetBoundary from "@/components/common/WidgetBoundary";
import WorkoutLogWizard from "@/components/workout/WorkoutLogWizard";
import BetaFeedbackModal from "@/components/feedback/BetaFeedbackModal";
import CalibrationMeter from "@/components/dashboard/CalibrationMeter";
import OnboardingEmptyState from "@/components/dashboard/OnboardingEmptyState";
import PlannedActualReconciliation from "@/components/dashboard/PlannedActualReconciliation";
import CoachBriefing from "@/components/dashboard/CoachBriefing";
import PhysiologyStrip from "@/components/dashboard/PhysiologyStrip";
import AnomalyAlertBanner from "@/components/dashboard/AnomalyAlertBanner";
import AISynthesisCard from "@/components/dashboard/AISynthesisCard";
import { Sun, TrendingUp, Activity, MessageCircle, HeartPulse, ArrowRight, Plus, LogIn, MessageSquare } from "lucide-react";

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [athlete, setAthlete] = useState(null);
  const [profileExists, setProfileExists] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [workouts, setWorkouts] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loadTimelineWorkouts, setLoadTimelineWorkouts] = useState([]);
  const [plannedWorkouts, setPlannedWorkouts] = useState([]);
  const [manualOpen, setManualOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const trackWorkoutIngested = () => {
    try { base44.analytics.track({ eventName: "workout_ingested" }); } catch {}
  };
  const { showDeepMetrics } = useUIPreferences();
  const { user, redirectToLogin } = useAuth();

  const loadAthleteData = useCallback(async (athleteId) => {
    const [freshAthlete, recentWorkouts, messageRows, planSessions] = await Promise.all([
      base44.entities.AthleteProfile.get(athleteId),
      base44.entities.WorkoutSession.filter({ athlete_id: athleteId }, "-date", 60),
      base44.entities.CoachMessage.filter({ athlete_id: athleteId }, "-created_date", 10),
      base44.entities.TrainingPlanSession.filter({ athlete_id: athleteId }, "-date", 60),
    ]);
    setAthlete(freshAthlete);
    setWorkouts(recentWorkouts.slice(0, 10));
    setMessages(messageRows);
    setLoadTimelineWorkouts(recentWorkouts);
    const todayKey = new Date().toISOString().split("T")[0];
    const in7Days = new Date();
    in7Days.setDate(in7Days.getDate() + 7);
    const in7DaysKey = in7Days.toISOString().split("T")[0];
    setPlannedWorkouts(planSessions.filter((p) => p.date >= todayKey && p.date <= in7DaysKey));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!user) return; // signed-out — show the sign-in prompt below
        // Prefer the profile explicitly linked on the user (fetch it directly by ID —
        // a filter by created_by_id misses profiles created under a different identity,
        // e.g. an earlier auth account or a service-role backend function, which is
        // exactly why a Gmail re-login "lost" an existing profile full of data).
        // RLS read allows id == user.data.athlete_profile_id, so this succeeds even
        // when created_by_id doesn't match the current user. Fall back to the most
        // recently updated owned profile only when no link is set.
        let profile = null;
        const linkedId = user.data?.athlete_profile_id;
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
          await loadAthleteData(profile.id);
        }
        // No profile found is NOT an error — it means onboarding is required.
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
      // here would let the user create a duplicate profile — so offer a retry instead.
      return (
        <div className="py-8 max-w-md mx-auto">
          <Card className="border-dashed text-center">
            <CardContent className="pt-8 pb-8 space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-accent flex items-center justify-center">
                <Activity className="w-6 h-6 text-accent-foreground" />
              </div>
              <h2 className="text-lg font-heading font-semibold">Couldn't reach your profile</h2>
              <p className="text-sm text-muted-foreground">We hit a snag loading your data. This is usually momentary — try again.</p>
              <Button onClick={() => window.location.reload()}>Retry</Button>
            </CardContent>
          </Card>
        </div>
      );
    }
    if (profileExists) {
      // A profile exists but failed to load (transient RLS/network error). Show a retry
      // instead of the onboarding wall — the wall would let the user create a duplicate.
      return (
        <div className="py-8 max-w-md mx-auto">
          <Card className="border-dashed text-center">
            <CardContent className="pt-8 pb-8 space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-accent flex items-center justify-center">
                <Activity className="w-6 h-6 text-accent-foreground" />
              </div>
              <h2 className="text-lg font-heading font-semibold">Couldn't load your profile</h2>
              <p className="text-sm text-muted-foreground">Your athlete profile exists but the dashboard hit a snag loading it. This is usually a momentary blip — try again.</p>
              <Button onClick={() => window.location.reload()}>Retry</Button>
            </CardContent>
          </Card>
        </div>
      );
    }
    return (
      <div className="py-8">
        <OnboardingFlow onCreated={(profile) => { setProfileExists(true); setAthlete(profile); }} />
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
            <OnboardingEmptyState athlete={athlete} onAddManual={() => setManualOpen(true)} />
          </section>
        ) : (
          <>
          <DashboardGreeting athlete={athlete} />
          <div className="space-y-8">
        <AnomalyAlertBanner />
        {/* 1 — Today's snapshot */}
        <section className="space-y-4">
          <SectionHeading index="01" title="Today's snapshot" description="Your form, readiness and prescribed session for today." icon={Sun} />
          <WidgetBoundary name="Physiology strip"><PhysiologyStrip athlete={athlete} /></WidgetBoundary>
          <WidgetBoundary name="Calibration meter"><CalibrationMeter athlete={athlete} athleteId={athlete.id} /></WidgetBoundary>
          <WidgetBoundary name="Today's session"><TodaySessionCard athleteId={athlete.id} /></WidgetBoundary>
        </section>

        {/* 2 — Load & Form (deep — collapses in Simplified mode) */}
        <CollapsibleSection
          title="02 · Load & Form"
          subtitle="Fitness, fatigue and the balance between them over time"
          icon={TrendingUp}
          deep
        >
          <WidgetBoundary name="Load & fatigue chart"><LoadFatigueChart completedSessions={loadTimelineWorkouts} plannedWorkouts={plannedWorkouts} /></WidgetBoundary>
          <WidgetBoundary name="Horizon strip"><HorizonStrip athleteId={athlete.id} /></WidgetBoundary>
        </CollapsibleSection>

        {/* 3 — Recent activity */}
        <section className="space-y-4">
          <SectionHeading
            index="03"
            title="Recent activity"
            description="Review your latest sessions and add new ones."
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
          <WidgetBoundary name="Coach briefing"><CoachBriefing athlete={athlete} /></WidgetBoundary>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <WidgetBoundary name="Quick import"><OcrDropzone athleteId={athlete.id} onSaved={() => { trackWorkoutIngested(); loadAthleteData(athlete.id); }} /></WidgetBoundary>
            <WidgetBoundary name="Recent workouts"><RecentWorkouts workouts={workouts} athlete={athlete} /></WidgetBoundary>
          </div>
        </section>

        {/* 3b — Planned vs. Actual (collapsible) */}
        <CollapsibleSection
          title="04 · Planned vs. Actual"
          subtitle="Reconciliation across your recent sessions"
          deep
        >
          <WidgetBoundary name="Planned vs actual"><PlannedActualReconciliation athleteId={athlete.id} /></WidgetBoundary>
        </CollapsibleSection>

        {/* 4 — Coach notes (collapsible) */}
        <CollapsibleSection
          title="05 · Coach notes"
          subtitle="Briefings & AI messages tuned to your trend"
          icon={MessageCircle}
          deep
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <WidgetBoundary name="Coach advice"><CoachAdvice /></WidgetBoundary>
            <WidgetBoundary name="Coach message feed"><CoachMessageFeed messages={messages} /></WidgetBoundary>
          </div>
        </CollapsibleSection>

        {/* 5 — Recovery & Readiness (collapsible) */}
        <CollapsibleSection
          title="06 · Recovery & Readiness"
          subtitle="Sleep, HRV, autonomic stress & lifestyle"
          icon={HeartPulse}
          deep
        >
          <WidgetBoundary name="AI synthesis"><AISynthesisCard athleteId={athlete.id} /></WidgetBoundary>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <WipWrapper featureName="Readiness Score">
              <ReadinessScoreCard />
            </WipWrapper>
            <WipWrapper featureName="Sleep & Energy">
              <SleepEnergyCard />
            </WipWrapper>
            <WipWrapper featureName="Autonomic Stress">
              <AutonomicStressCard />
            </WipWrapper>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <WipWrapper featureName="Recovery Lab">
              <RecoveryLab athleteId={athlete.id} />
            </WipWrapper>
            <WipWrapper featureName="Holistic Factors">
              <HolisticFactorsLog athleteId={athlete.id} />
            </WipWrapper>
          </div>
        </CollapsibleSection>

          </div>
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
        onSaved={() => { trackWorkoutIngested(); loadAthleteData(athlete.id); }}
      />
      {/* Prominent beta feedback entry — a floating button so testers reach
          the feedback channel without digging into the account menu. */}
      <button
        type="button"
        onClick={() => setFeedbackOpen(true)}
        className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium shadow-lg hover:bg-primary/90 pb-safe mr-safe"
        aria-label="Send beta feedback"
      >
        <MessageSquare className="w-4 h-4" /> Beta feedback
      </button>
      <BetaFeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </FitnessProvider>
  );
}