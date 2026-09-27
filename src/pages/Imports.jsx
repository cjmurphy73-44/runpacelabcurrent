import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Plus, ArrowRight, Watch, Upload, FlaskConical, Webhook, Settings } from "lucide-react";
import HelpLink from "@/components/guide/HelpLink";
import BulkWorkoutImport from "@/components/dashboard/BulkWorkoutImport";
import WebhookSyncPanel from "@/components/imports/WebhookSyncPanel";
import LabResultsImport from "@/components/imports/LabResultsImport";
import ManualWorkoutModal from "@/components/workout/ManualWorkoutModal";
import OnboardingFlow from "@/components/dashboard/OnboardingFlow";
import GarminIntegration from "@/components/settings/GarminIntegration";
import StravaIntegration from "@/components/settings/StravaIntegration";
import CorosIntegration from "@/components/settings/CorosIntegration";
import SectionHeading from "@/components/layout/SectionHeading";

export default function Imports() {
  const navigate = useNavigate();
  const [athlete, setAthlete] = useState(null);
  const [loading, setLoading] = useState(true);
  const [manualOpen, setManualOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await base44.functions.invoke("fetchAthleteProfile", {});
        setAthlete(res.data?.athlete || null);
      } catch {
        setAthlete(null);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
      </div>
    );
  }

  if (!athlete) {
    return (
      <div className="max-w-2xl mx-auto py-8 space-y-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-heading font-bold">Imports & Sync</h1>
          <p className="text-sm text-muted-foreground">
            Let's set up your athlete profile first — then you can connect devices and import workouts here.
          </p>
        </div>
        <OnboardingFlow onCreated={(profile) => setAthlete(profile)} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold">Imports & Sync</h1>
          <p className="text-sm text-muted-foreground">
            Get your training and recovery data into TrainPaceLab, in this order.
          </p>
        </div>
        <HelpLink section="connect-data" label="How to export from your watch" />
      </div>

      {/* Quick manual log — for users with no device yet */}
      <Card className="border-dashed bg-muted/30">
        <CardContent className="pt-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <p className="font-heading font-semibold">No device handy? Log one manually.</p>
            <p className="text-sm text-muted-foreground">
              Add a quick session and your CTL / ATL / TSB refresh instantly — no file needed.
            </p>
          </div>
          <Button onClick={() => setManualOpen(true)}>
            <Plus className="w-4 h-4" /> Add a manual workout
          </Button>
        </CardContent>
      </Card>

      {/* 1 — Connect a device (automated sync) */}
      <section className="space-y-3">
        <SectionHeading index="01" title="Connect a device" description="Automated sync — new activities and recovery flow in without you lifting a finger." icon={Watch} />
        <div className="space-y-3">
          <CorosIntegration athleteId={athlete.id} />
          <GarminIntegration athleteId={athlete.id} />
          <StravaIntegration athleteId={athlete.id} />
          <Card className="border-dashed">
            <CardContent className="pt-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">More recovery wearables</p>
                <p className="text-xs text-muted-foreground">Oura, Whoop, Withings, Polar, Fitbit, Suunto — connect them in Settings.</p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link to="/settings"><Settings className="w-4 h-4" /> Open Settings</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 2 — Import workout files */}
      <section className="space-y-3">
        <SectionHeading index="02" title="Import workout files" description="Bulk-upload .fit or .csv exports from your watch or training platform." icon={Upload} />
        <BulkWorkoutImport athleteId={athlete.id} onUploaded={() => {}} />
        <p className="text-xs text-muted-foreground">
          Supports <span className="font-medium">.fit</span> and <span className="font-medium">.csv</span> from Strava, COROS, Garmin and others.
          {" "}<span className="font-medium">.gpx</span> isn't supported yet — convert it to FIT/CSV or use a device connection above.
        </p>
      </section>

      {/* 3 — Lab results */}
      <section className="space-y-3">
        <SectionHeading index="03" title="Lab results" description="Blood panels, VO₂max, lactate-at-threshold — feed your recovery baselines and AI synthesis." icon={FlaskConical} />
        <Card>
          <CardContent className="pt-5">
            <LabResultsImport athleteId={athlete.id} />
          </CardContent>
        </Card>
        <p className="text-xs text-muted-foreground">One row per metric per date.</p>
      </section>

      {/* 4 — Advanced webhook / API */}
      <section className="space-y-3">
        <SectionHeading index="04" title="Webhook & API" description="Advanced — push workout summaries from your own scripts, Zapier, or Make." icon={Webhook} />
        <WebhookSyncPanel athleteId={athlete.id} />
      </section>

      <ManualWorkoutModal
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        athleteId={athlete.id}
        onSaved={() => navigate("/")}
      />

      <div className="pt-2">
        <Button asChild variant="ghost" size="sm"><Link to="/app"><ArrowRight className="w-4 h-4" />Back to dashboard</Link></Button>
      </div>
    </div>
  );
}