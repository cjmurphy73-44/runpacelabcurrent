import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Plus, ArrowRight, Watch, Upload, FlaskConical, Webhook, Settings, HeartPulse } from "lucide-react";
import HelpLink from "@/components/guide/HelpLink";
import BulkWorkoutImport from "@/components/dashboard/BulkWorkoutImport";
import OcrDropzone from "@/components/imports/OcrDropzone";
import RecoveryImportSection from "@/components/imports/RecoveryImportSection";
import WebhookSyncPanel from "@/components/imports/WebhookSyncPanel";
import LabResultsImport from "@/components/imports/LabResultsImport";
import ManualWorkoutModal from "@/components/workout/ManualWorkoutModal";
import OnboardingFlow from "@/components/dashboard/OnboardingFlow";
import { useAuth } from "@/lib/AuthContext";
import { ensureProfileLinked } from "@/lib/profileLinkage";
import GarminIntegration from "@/components/settings/GarminIntegration";
import StravaIntegration from "@/components/settings/StravaIntegration";
import CorosIntegration from "@/components/settings/CorosIntegration";
import SectionHeading from "@/components/layout/SectionHeading";

export default function Imports() {
  const navigate = useNavigate();
  const { hash } = useLocation();
  const { user } = useAuth();
  const [athlete, setAthlete] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setLoadFailed(false);
      try {
        const res = await base44.functions.invoke("fetchAthleteProfile", {});
        const profile = res.data?.athlete || null;
        if (profile) await ensureProfileLinked(user, profile);
        setAthlete(profile);
      } catch {
        setAthlete(null);
        setLoadFailed(true);
      }
      setLoading(false);
    })();
  }, [user]);

  useEffect(() => {
    if (!athlete?.id || (hash !== "#workout-files" && hash !== "#devices")) return;
    const section = document.getElementById(hash.slice(1));
    section?.focus({ preventScroll: true });
    section?.scrollIntoView({ block: "start" });
  }, [athlete?.id, hash]);

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
      </div>
    );
  }

  if (loadFailed) {
    return (
      <div role="status" className="mx-auto max-w-xl space-y-3 py-8">
        <p>Could not load your athlete profile for imports.</p>
        <Button variant="outline" onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  if (!athlete) {
    return (
      <div className="max-w-2xl mx-auto py-8 space-y-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-heading font-bold">Imports & Sync</h1>
          <p className="text-sm text-muted-foreground">
            Let's set up your athlete profile first, then you can connect devices and import workouts here.
          </p>
        </div>
        <OnboardingFlow onCreated={(profile) => setAthlete(profile)} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-heading font-bold">Imports & Sync</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm" className="min-h-11">
            <Link to="#devices"><Watch aria-hidden="true" /> Connect a device</Link>
          </Button>
          <Button onClick={() => setManualOpen(true)} variant="outline" size="sm" className="min-h-11">
            <Plus aria-hidden="true" /> Log workout
          </Button>
        </div>
      </div>

      <section id="workout-files" aria-label="File import" tabIndex={-1} className="space-y-3 scroll-mt-24">
        <SectionHeading title="Import workout files" icon={Upload} action={
          <HelpLink section="connect-data" label="Export help" />
        } />
        <BulkWorkoutImport key={athlete.id} athleteId={athlete.id} />
        <details className="rounded-lg border border-border bg-card">
          <summary className="min-h-11 cursor-pointer px-4 py-3 text-sm font-medium">Import a screenshot</summary>
          <OcrDropzone athleteId={athlete.id} onSaved={() => {
            try { base44.analytics.track({ eventName: "workout_ingested" }); } catch {}
          }} />
        </details>
      </section>

      <section id="devices" aria-label="Devices" tabIndex={-1} className="space-y-3 scroll-mt-24">
        <SectionHeading title="Connect a device" description="Sync workouts and recovery from your supported devices." icon={Watch} />
        <div className="space-y-3">
          <CorosIntegration athleteId={athlete.id} />
          <GarminIntegration athleteId={athlete.id} />
          <StravaIntegration athleteId={athlete.id} />
          <Card className="border-dashed">
            <CardContent className="pt-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">More recovery wearables</p>
                <p className="text-xs text-muted-foreground">Oura, Whoop, Withings, Polar, Fitbit, Suunto, connect them in Settings.</p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link to="/settings"><Settings className="w-4 h-4" /> Open Settings</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <details className="rounded-lg border border-border bg-card">
        <summary className="min-h-11 cursor-pointer px-4 py-3 text-sm font-medium">Recovery, lab results and API</summary>
        <div className="space-y-6 px-4 pb-4">
          <section className="space-y-3">
            <SectionHeading title="Recovery & sleep" icon={HeartPulse} />
            <RecoveryImportSection athleteId={athlete.id} />
          </section>
          <section className="space-y-3">
            <SectionHeading title="Lab results" icon={FlaskConical} />
            <LabResultsImport athleteId={athlete.id} />
          </section>
          <section className="space-y-3">
            <SectionHeading title="Webhook & API" icon={Webhook} />
            <WebhookSyncPanel athleteId={athlete.id} />
          </section>
        </div>
      </details>

      <ManualWorkoutModal
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        athleteId={athlete.id}
        onSaved={(workout) => navigate(`/workouts/${encodeURIComponent(workout.id)}`)}
      />

      <div className="pt-2">
        <Button asChild variant="ghost" size="sm"><Link to="/app"><ArrowRight className="w-4 h-4" />Back to dashboard</Link></Button>
      </div>
    </div>
  );
}
