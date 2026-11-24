import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import RecordingIntervals from "@/components/workout/RecordingIntervals";
import { recordingCoverage } from "@/lib/recordingCoverage";

export default function CorosOriginalRecording({ workout }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadRecording() {
    setLoading(true);
    setError("");
    try {
      const { data } = await base44.functions.invoke("corosRecording", {
        action: "recover_recording", workout_id: workout.id,
      });
      if (data?.status !== "verified" || !Array.isArray(data.streams) || data.streams.length !== data.sample_count) {
        throw new Error("The original COROS recording is unavailable.");
      }
      setResult({ ...workout, streams: data.streams });
    } catch (err) {
      setError(err?.response?.data?.error || err?.data?.error || err?.message || "Could not load the original recording.");
    } finally {
      setLoading(false);
    }
  }

  const coverage = result ? recordingCoverage(result) : null;
  const roundedCoverage = coverage && coverage.savedSeconds !== coverage.totalSeconds ? "≈" : "";
  return (
    <section aria-label="Original COROS recording" className="space-y-3">
      {!result && (
        <Button type="button" variant="outline" size="sm" disabled={loading} onClick={loadRecording}>
          {loading ? "Verifying the recording…" : "Load original COROS recording"}
        </Button>
      )}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {coverage && (
        <p role="status" className="text-sm text-muted-foreground">
          Original FIT verified · {coverage.sampleCount.toLocaleString()} samples · {roundedCoverage}{coverage.percent}% elapsed-time coverage
        </p>
      )}
      <RecordingIntervals workout={result ?? workout} />
    </section>
  );
}
