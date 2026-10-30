import React, { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Sparkles, ShieldAlert } from "lucide-react";
import HelpLink from "@/components/guide/HelpLink";
import { useCoachInjurySignal } from "@/hooks/useCoachInjurySignal";
import OnboardingFlow from "@/components/dashboard/OnboardingFlow";
import TrainingPlanGenerator from "@/components/trainingplan/TrainingPlanGenerator";
import TrainingPlanTimeline from "@/components/trainingplan/TrainingPlanTimeline";
import TrainingPlanWeeklyBreakdown from "@/components/trainingplan/TrainingPlanWeeklyBreakdown";
import TrainingPlanExtras from "@/components/trainingplan/TrainingPlanExtras";

export default function TrainingPlan() {
  const [loading, setLoading] = useState(true);
  const [athlete, setAthlete] = useState(null);
  const [plan, setPlan] = useState(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [commitError, setCommitError] = useState(null);
  const injury = useCoachInjurySignal(athlete?.id);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const user = await base44.auth.me();
      if (!user) { setLoading(false); return; }
      // Same precedence as the dashboard: the profile linked on the user record first,
      // then the most recently updated owned profile. Keeps the plan journey working
      // even when the profile was created under a different identity.
      let activeAthlete = null;
      const linkedId = user.data?.athlete_profile_id;
      if (linkedId) {
        try { activeAthlete = await base44.entities.AthleteProfile.get(linkedId); }
        catch (err) { console.warn("Linked athlete_profile_id not resolvable:", err); activeAthlete = null; }
      }
      if (!activeAthlete) {
        const profiles = await base44.entities.AthleteProfile.filter({ created_by_id: user.id }, "-updated_date", 5);
        activeAthlete = profiles[0] || null;
      }
      if (activeAthlete) {
        setAthlete(activeAthlete);
        const [drafts, activePlans] = await Promise.all([
          base44.entities.TrainingPlan.filter({ athlete_id: activeAthlete.id, status: "draft" }, "-created_date", 1).catch(() => []),
          base44.entities.TrainingPlan.filter({ athlete_id: activeAthlete.id, status: "active" }, "-created_date", 1).catch(() => []),
        ]);
        setPlan(drafts[0] || activePlans[0] || null);
      }
    } catch (e) {
      console.error("TrainingPlan load failed", e);
      setLoadError(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCommit = async () => {
    if (!plan?.id) return;
    setCommitting(true);
    setCommitError(null);
    try {
      const res = await base44.functions.invoke("commitTrainingPlan", { plan_id: plan.id });
      if (res.data?.training_plan) setPlan(res.data.training_plan);
    } catch (e) {
      console.error("Commit failed", e);
      setCommitError(e?.message || "Couldn't commit the plan. Please try again.");
    } finally {
      setCommitting(false);
    }
  };

  if (loading) return <div className="text-center py-20 text-muted-foreground">Loading...</div>;

  if (loadError) {
    return (
      <div className="space-y-4 max-w-xl mx-auto py-12">
        <Alert variant="destructive">
          <ShieldAlert className="w-4 h-4" />
          <AlertTitle>Couldn't load your training plan</AlertTitle>
          <AlertDescription>Something went wrong fetching your plan. Check your connection and try again.</AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => load()}>Retry</Button>
      </div>
    );
  }

  if (!athlete) {
    // Profile setup happens right here, in the Plan tab — the athlete is never sent to the
    // dashboard or settings and then asked to come back. One short form, then straight on
    // to plan creation.
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="space-y-1">
          <h1 className="text-xl font-heading font-bold">Build your plan</h1>
          <p className="text-sm text-muted-foreground">
            Your plan is built around your physiology, so we need a few basics first. Fill this in
            and you'll continue straight into plan creation — you won't need to go anywhere else.
          </p>
        </div>
        <OnboardingFlow
          onCreated={(profile) => {
            setAthlete(profile);
            setShowGenerator(true);
          }}
        />
      </div>
    );
  }

  if (!plan || showGenerator) {
    return (
      <div className="space-y-4">
        {plan && (
          <Button variant="ghost" size="sm" onClick={() => setShowGenerator(false)}>← Back to current plan</Button>
        )}
        <TrainingPlanGenerator
          athleteId={athlete.id}
          athlete={athlete}
          onAthleteUpdated={(updated) => setAthlete(updated)}
          onGenerated={(newPlan) => { setPlan(newPlan); setShowGenerator(false); }}
        />
      </div>
    );
  }

  const isDraft = plan?.status === "draft";

  return (
    <div className="space-y-6">
      {isDraft ? (
        <Alert>
          <Sparkles className="w-4 h-4" />
          <AlertTitle>Review your new plan</AlertTitle>
          <AlertDescription className="flex items-center justify-between flex-wrap gap-3 mt-1">
            <span>This plan is a draft — nothing has been added to your calendar yet. Review the macrocycle below, then confirm to commit it.</span>
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={() => setShowGenerator(true)}>Discard & Regenerate</Button>
              <Button size="sm" onClick={handleCommit} disabled={committing}>
                {committing ? "Committing..." : "Confirm & Commit to Calendar"}
              </Button>
            </div>
            {commitError && (
              <p className="text-xs text-destructive w-full mt-2">{commitError}</p>
            )}
          </AlertDescription>
        </Alert>
      ) : (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => setShowGenerator(true)}>Generate New Plan</Button>
        </div>
      )}
      {injury.holdReason && (
        <Alert variant="destructive">
          <ShieldAlert className="w-4 h-4" />
          <AlertTitle>Coach-directed hold active</AlertTitle>
          <AlertDescription>
            Running sessions in this plan are paused per your recent coach conversation — treat upcoming run days as rest or recovery (rest, cross-train on the bike/pool, or easy strength) until you're cleared.
            <span className="block italic mt-1">{injury.summary}</span>
          </AlertDescription>
        </Alert>
      )}
      <TrainingPlanTimeline plan={plan} />
      <TrainingPlanWeeklyBreakdown weeklyPlans={plan.weekly_plans || []} />
      <TrainingPlanExtras plan={plan} />
      <div><HelpLink section="plans" label="How training plans work" /></div>
    </div>
  );
}