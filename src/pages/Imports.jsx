import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Upload, Webhook, Plus, ArrowLeft } from "lucide-react";
import BulkWorkoutImport from "@/components/dashboard/BulkWorkoutImport";
import WebhookSyncPanel from "@/components/imports/WebhookSyncPanel";
import ManualWorkoutModal from "@/components/workout/ManualWorkoutModal";

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

      <Card className="border-dashed bg-muted/30">
        <CardContent className="pt-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <p className="font-heading font-semibold">No device? No problem.</p>
            <p className="text-sm text-muted-foreground">
              Log a quick workout manually and watch your CTL / ATL / TSB refresh instantly.
            </p>
          </div>
          <Button onClick={() => setManualOpen(true)}>
            <Plus className="w-4 h-4" /> Add a manual workout
          </Button>
        </CardContent>
      </Card>

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

      <ManualWorkoutModal
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        athleteId={athlete.id}
        onSaved={() => navigate("/")}
      />
    </div>
  );
}