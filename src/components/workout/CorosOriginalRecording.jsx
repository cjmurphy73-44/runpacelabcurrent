import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import RecordingIntervals from "@/components/workout/RecordingIntervals";
import WorkoutZonePanel from "@/components/workout/WorkoutZonePanel";
import { useAuth } from "@/lib/AuthContext";

export default function CorosOriginalRecording({ workout, athlete, hasInlineRecording, hasCompleteInlineRecording, onRestored }) {
  const { user } = useAuth();
  const { data: result, isFetching, error, refetch } = useQuery({
    queryKey: ["coros-recording-analysis", user?.id, workout.id, workout.provider_activity_id],
    enabled: false,
    retry: false,
    gcTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await base44.functions.invoke("corosRecording", {
        action: hasCompleteInlineRecording ? "analyze_recording" : "restore_recording",
        workout_id: workout.id,
        response_mode: "analysis",
      });
      const hasAnalysis = Array.isArray(data?.analysis?.windows?.[300]) && Array.isArray(data.analysis.windows[600]);
      if (data?.status !== "verified" || !hasAnalysis) {
        throw new Error("The original COROS recording is unavailable.");
      }
      return data;
    },
  });

  const coverage = result?.analysis?.coverage;
  const roundedCoverage = coverage && coverage.savedSeconds !== coverage.totalSeconds ? "≈" : "";
  return (
    <section aria-label="Original COROS recording" className="space-y-3">
      {!result && (
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" disabled={isFetching || !user?.id} onClick={async () => {
            const { data } = await refetch();
            if (data?.restored_workout) onRestored?.(data.restored_workout, data.training_load_refreshed);
          }}>
            {isFetching ? "Verifying the recording…" : "Load original COROS recording"}
          </Button>
          {!hasInlineRecording && <Link to="/import#workout-files" className="text-sm text-primary hover:underline">Import a recording</Link>}
        </div>
      )}
      {error && <p role="alert" className="text-sm text-destructive">
        {error?.response?.data?.error || error?.data?.error || error.message || "Could not load the original recording."}
      </p>}
      {coverage && (
        <p role="status" className="text-sm text-muted-foreground">
          {result.source === "archive" ? "Verified archived FIT" : "Original FIT retrieved from COROS"} · {coverage.sampleCount.toLocaleString()} samples · {roundedCoverage}{coverage.percent}% elapsed-time coverage
        </p>
      )}
      {result?.restored_workout && (
        <p className="text-sm text-muted-foreground">
          Recording samples saved to this workout.
          {result.training_load_refreshed === true && " Training load refreshed."}
          {result.training_load_refreshed === false && " Training-load history still needs to refresh."}
        </p>
      )}
      {(result || hasInlineRecording) && (
        <WorkoutZonePanel workout={workout} athlete={athlete} originalAnalysis={result?.analysis} showImport={false} />
      )}
      <RecordingIntervals workout={workout} windowsByDuration={result?.analysis?.windows} />
    </section>
  );
}
