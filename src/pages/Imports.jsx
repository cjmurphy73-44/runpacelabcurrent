import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Upload, Webhook } from "lucide-react";
import BulkWorkoutImport from "@/components/dashboard/BulkWorkoutImport";
import WebhookSyncPanel from "@/components/imports/WebhookSyncPanel";

export default function Imports() {
  const [athlete, setAthlete] = useState(null);
  const [loading, setLoading] = useState(true);

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
      <div className="max-w-2xl mx-auto space-y-2">
        <h1 className="text-2xl font-heading font-bold">Imports & Sync</h1>
        <p className="text-sm text-muted-foreground">
          Create your athlete profile on the dashboard first, then return here to import workouts.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold">Imports & Sync</h1>
        <p className="text-sm text-muted-foreground">
          Add workouts via bulk file upload or automated webhooks.
        </p>
      </div>

      <Tabs defaultValue="bulk" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="bulk" className="flex items-center gap-2">
            <Upload className="w-4 h-4" /> Bulk File Upload
          </TabsTrigger>
          <TabsTrigger value="webhook" className="flex items-center gap-2">
            <Webhook className="w-4 h-4" /> Automated Webhooks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bulk" className="mt-4 space-y-3">
          <BulkWorkoutImport athleteId={athlete.id} onUploaded={() => {}} />
          <p className="text-xs text-muted-foreground">
            Supports <span className="font-medium">.fit</span> and <span className="font-medium">.csv</span> exports from
            Strava, COROS, Garmin and others. <span className="font-medium">.gpx</span> support is on the roadmap — for now,
            convert GPX to FIT/CSV or use the webhook tab.
          </p>
        </TabsContent>

        <TabsContent value="webhook" className="mt-4">
          <WebhookSyncPanel athleteId={athlete.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}