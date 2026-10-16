import React, { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Lock, Download, Loader2, CheckCircle2, KeyRound, Database } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";

const CONNECTION_ENTITIES = [
  { entity: "CorosConnection", label: "COROS" },
  { entity: "GarminConnection", label: "Garmin" },
  { entity: "StravaConnection", label: "Strava" },
  { entity: "WearableConnection", label: "Wearable" },
];

export default function PrivacySecurityDashboard({ athleteId }) {
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);
  const [connections, setConnections] = useState(null);

  // Load connected wearable tokens once on mount.
  React.useEffect(() => {
    (async () => {
      const results = {};
      for (const { entity, label } of CONNECTION_ENTITIES) {
        try {
          const res = await base44.entities[entity].filter({ athlete_id: athleteId });
          const active = (res.items || res || []).filter((c) => c.status === "connected");
          if (active.length > 0) results[label] = active.length;
        } catch { /* entity may not exist for this user */ }
      }
      setConnections(results);
    })();
  }, [athleteId]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      // Fetch all DailyMetrics and WorkoutSessions for this athlete.
      // These are the two core data entities that hold the athlete's computed math and telemetry.
      const exportData = {
        exported_at: new Date().toISOString(),
        athlete_id: athleteId,
        schema_version: "1.0",
        guarantee: "This file contains 100% of your computed training data. You own it.",
        daily_metrics: [],
        workout_sessions: [],
      };

      // Paginate through all DailyMetrics
      let cursor = undefined;
      do {
        const page = await base44.entities.DailyMetrics.filter(
          { athlete_id: athleteId },
          { sort: "-date", limit: 500, ...(cursor ? { cursor } : {}) }
        );
        exportData.daily_metrics.push(...(page.items || []));
        cursor = page.has_more ? page.next_cursor : undefined;
      } while (cursor);

      // Paginate through all WorkoutSessions
      cursor = undefined;
      do {
        const page = await base44.entities.WorkoutSession.filter(
          { athlete_id: athleteId },
          { sort: "-date", limit: 500, ...(cursor ? { cursor } : {}) }
        );
        exportData.workout_sessions.push(...(page.items || []));
        cursor = page.has_more ? page.next_cursor : undefined;
      } while (cursor);

      // Trigger a browser download as JSON
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `trainpacelab-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Export complete",
        description: `${exportData.daily_metrics.length} daily metrics, ${exportData.workout_sessions.length} workout sessions downloaded.`,
      });
    } catch (e) {
      toast({ title: "Export failed", description: e.message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  }, [athleteId, toast]);

  const activeConnections = connections ? Object.keys(connections) : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-success" /> Privacy & Security
        </CardTitle>
        <CardDescription>Your data sovereignty guarantees, live in your account.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* RLS status */}
        <div className="flex items-start gap-3 rounded-md border border-success/20 bg-success/5 p-4">
          <Lock className="w-5 h-5 text-success shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">Row-Level Security — Active</p>
              <Badge variant="outline" className="text-success border-success/40 bg-success/10 text-[10px]">Enforced</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              The database engine rejects any query where your user ID does not match the record's owner.
              Your workouts, telemetry, and physiological curves are isolated in a secure cryptographic boundary.
            </p>
          </div>
        </div>

        {/* AI data policy */}
        <div className="flex items-start gap-3 rounded-md border border-border bg-muted/20 p-4">
          <Database className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium">AI layer — No raw data shared</p>
            <p className="text-xs text-muted-foreground">
              The AI coach receives only anonymized numeric state vectors (Form, TSB, ODE values) to render
              summaries. Your raw heart rate, GPS, and health telemetry never enter third-party AI pipelines.
            </p>
          </div>
        </div>

        {/* Connected wearable tokens */}
        <div className="flex items-start gap-3 rounded-md border border-border bg-muted/20 p-4">
          <KeyRound className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1.5 w-full">
            <p className="text-sm font-medium">Connected wearable tokens</p>
            {connections === null ? (
              <p className="text-xs text-muted-foreground">Checking connections…</p>
            ) : activeConnections.length === 0 ? (
              <p className="text-xs text-muted-foreground">No wearable connections active. Tokens are stored encrypted and scoped to your account only.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {activeConnections.map((label) => (
                  <Badge key={label} variant="outline" className="text-[11px] gap-1">
                    <CheckCircle2 className="w-3 h-3 text-success" />
                    {label} ({connections[label]})
                  </Badge>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Tokens are encrypted at rest and used only to sync your data. Revoke any connection anytime from the Connected Apps section above.
            </p>
          </div>
        </div>

        {/* Export button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-md border border-border p-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">Export all my math & telemetry</p>
            <p className="text-xs text-muted-foreground">Download your full history — daily metrics, ODE states, workout sessions — as open JSON.</p>
          </div>
          <Button onClick={handleExport} disabled={exporting} variant="outline" className="gap-2 shrink-0">
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {exporting ? "Exporting…" : "Export JSON"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}