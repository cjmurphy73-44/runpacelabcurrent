import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/AuthContext";

const MAX_BYTES = 2 * 1024 * 1024;
const message = (error) => error?.response?.data?.error || error.message || "Could not open the original recording.";

export function useOriginalRecording(workout, hasCompleteInlineRecording, coachView) {
  const { user } = useAuth();
  const { id, original_recording_sha256: sha256 } = workout ?? {};
  return useQuery({
    queryKey: ["workout-original-recording", user?.id, id, sha256],
    enabled: Boolean(user?.id && id && sha256 && !hasCompleteInlineRecording && !coachView),
    retry: false,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await base44.functions.invoke("workoutOriginalRecording", { action: "read", workout_id: id });
      if (data?.status !== "verified" || data.sha256 !== sha256 || !data.analysis) {
        throw new Error("The saved original could not be verified.");
      }
      return data.analysis;
    },
  });
}

export default function WorkoutOriginalRecording({ workout, canAttach, coverage, onSave }) {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const hasOriginal = Boolean(workout.original_recording_sha256);

  async function save(event) {
    event.preventDefault();
    if (!file || busy) return;
    setError("");
    if (!/\.(fit|tcx)$/i.test(file.name) || !file.size || file.size > MAX_BYTES) {
      setError("Choose a FIT or TCX file up to 2 MiB.");
      return;
    }
    setBusy(true);
    try {
      const { data } = await base44.functions.invoke("workoutOriginalRecording", {
        action: "save", workout_id: workout.id, file,
      });
      if (data?.status !== "verified" || data.workout?.id !== workout.id || !data.analysis) {
        throw new Error("The attachment could not be confirmed.");
      }
      onSave(data);
      setFile(null);
    } catch (error) {
      setError(message(error));
    } finally {
      setBusy(false);
    }
  }

  async function download() {
    setBusy(true);
    setError("");
    try {
      const { data } = await base44.functions.invoke("workoutOriginalRecording", { action: "download", workout_id: workout.id });
      if (data?.sha256 !== workout.original_recording_sha256 || !data.file_b64 || !["fit", "tcx"].includes(data.format)) {
        throw new Error("The saved original could not be verified.");
      }
      const bytes = Uint8Array.from(atob(data.file_b64), (character) => character.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: "application/octet-stream" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `workout-${workout.date}.${data.format}`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setError(message(error));
    } finally {
      setBusy(false);
    }
  }

  if (!canAttach && !hasOriginal) return null;
  return (
    <div className="space-y-2 border-t border-border pt-3">
      {hasOriginal ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <p role="status" className="text-sm text-muted-foreground">
            Original file saved privately.
            {coverage && ` ${coverage.sampleCount.toLocaleString()} samples · ${coverage.percent}% elapsed-time coverage`}
          </p>
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={download}>
            {busy ? "Verifying…" : "Download original"}
          </Button>
        </div>
      ) : (
        <form onSubmit={save} className="space-y-2">
          <Label htmlFor="original-workout-file">Attach the original FIT or TCX</Label>
          <p id="original-workout-help" className="text-xs text-muted-foreground">
            Choose the device recording for this workout. We’ll check the match and keep it with this session.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Input id="original-workout-file" type="file" accept=".fit,.tcx" aria-describedby="original-workout-help"
              className="h-10 max-w-sm" disabled={busy} onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setError("");
              }} />
            <Button type="submit" size="sm" disabled={!file || busy}>{busy ? "Checking recording…" : "Attach recording"}</Button>
          </div>
        </form>
      )}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
