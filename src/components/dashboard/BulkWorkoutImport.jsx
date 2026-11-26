import React, { useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { summarizeBulkIngestResponse } from "@/lib/bulkIngestOutcome";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { FolderOpen, AlertTriangle } from "lucide-react";

const BATCH_SIZE = 5;

function isSupportedFile(name) {
  return /\.(fit|tcx|csv)$/i.test(name);
}

export default function BulkWorkoutImport({ athleteId }) {
  const [fileList, setFileList] = useState([]);
  const [skippedCount, setSkippedCount] = useState(0);
  const [sport, setSport] = useState("running");
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(null); // { phase, current, total }
  const [resultsSummary, setResultsSummary] = useState(null); // { created, duplicates, errors }
  const [loadRefresh, setLoadRefresh] = useState(null);
  const filesId = useId();
  const sportId = useId();
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  const addFiles = (fileArray) => {
    const valid = fileArray.filter((f) => isSupportedFile(f.name));
    const skipped = fileArray.length - valid.length;
    setFileList(valid);
    setSkippedCount(skipped);
    setStatus(null);
    setResultsSummary(null);
    setLoadRefresh(null);
  };

  const refreshTrainingLoad = async () => {
    setLoadRefresh("refreshing");
    try {
      const { data } = await base44.functions.invoke("recalculateCTLATLTSB", { athlete_id: athleteId });
      setLoadRefresh(data?.success === true ? "complete" : "failed");
    } catch {
      setLoadRefresh("failed");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (fileList.length === 0 || busy || loadRefresh === "refreshing") return;
    if (!athleteId) {
      setStatus({ type: "error", message: "No athlete profile found. Create your athlete profile before importing workouts." });
      return;
    }
    setBusy(true);
    setStatus(null);
    setResultsSummary(null);
    setLoadRefresh(null);

    let createdCount = 0;
    let workoutId = null;
    let duplicateCount = 0;
    const allErrors = [];
    const totalBatches = Math.ceil(fileList.length / BATCH_SIZE);

    for (let b = 0; b < totalBatches; b++) {
      setProgress({ phase: "importing", current: b + 1, total: totalBatches });
      const batch = fileList.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);
      try {
        const fileEntries = [];
        for (const f of batch) {
          const { file_url } = await base44.integrations.Core.UploadFile({ file: f });
          fileEntries.push({ file_url, file_name: f.name, sport });
        }
        const res = await base44.functions.invoke("bulkIngestWorkouts", { athlete_id: athleteId, files: fileEntries });
        const outcome = summarizeBulkIngestResponse(res?.data);
        // A failed batch can still have successfully persisted sessions.
        createdCount += outcome.created;
        if (outcome.workoutId) workoutId = outcome.workoutId;
        duplicateCount += outcome.duplicates;
        allErrors.push(...outcome.failures);
      } catch (err) {
        allErrors.push({ file_name: `Batch ${b + 1}`, error: err.message });
      }
    }

    setResultsSummary({
      created: createdCount,
      duplicates: duplicateCount,
      errors: allErrors,
      workoutId: createdCount === 1 ? workoutId : null,
    });

    const outcome = [
      `${createdCount} saved`,
      duplicateCount > 0 && `${duplicateCount} duplicate${duplicateCount === 1 ? "" : "s"} skipped`,
      allErrors.length > 0 && `${allErrors.length} to review`,
    ].filter(Boolean).join(" · ");
    setStatus({
      type: allErrors.length > 0 ? (createdCount > 0 ? "warning" : "error") : "success",
      message: allErrors.length ? `${outcome}. Check your workout history before retrying.` : outcome,
    });

    if (!allErrors.length) {
      setFileList([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (folderInputRef.current) folderInputRef.current.value = "";
    }
    if (createdCount > 0) await refreshTrainingLoad();
    setBusy(false);
    setProgress(null);
  };

  const buttonLabel = progress
      ? `Processing batch ${progress.current}/${progress.total}…`
    : fileList.length ? `Import ${fileList.length} file${fileList.length === 1 ? "" : "s"}` : "Import files";

  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor={filesId}>Workout files</Label>
            <p id={`${filesId}-formats`} className="mt-0.5 text-xs text-muted-foreground">FIT, TCX or CSV</p>
            <div className="mt-1.5 flex flex-col gap-2">
              <Input
                id={filesId}
                ref={fileInputRef}
                aria-describedby={`${filesId}-formats`}
                type="file"
                accept=".fit,.tcx,.csv,application/vnd.ant.fit,application/octet-stream"
                multiple
                disabled={busy || loadRefresh === "refreshing"}
                onChange={(e) => addFiles(Array.from(e.target.files || []))}
                className="min-h-11 text-sm"
              />
              <input
                ref={folderInputRef}
                type="file"
                webkitdirectory=""
                multiple
                disabled={busy || loadRefresh === "refreshing"}
                className="hidden"
                onChange={(e) => addFiles(Array.from(e.target.files || []))}
              />
              <button
                type="button"
                disabled={busy || loadRefresh === "refreshing"}
                onClick={() => folderInputRef.current?.click()}
                className="inline-flex min-h-11 w-fit items-center gap-1.5 text-sm font-medium hover:underline"
              >
                <FolderOpen className="h-4 w-4 text-primary" aria-hidden="true" /> Choose a folder
              </button>
            </div>
            {skippedCount > 0 && (
              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Skipped {skippedCount} unsupported file(s).
              </p>
            )}
            {fileList.length > 0 && <p className="mt-1 text-xs text-muted-foreground">{fileList.length} ready to import</p>}
          </div>

          <div>
            <Label htmlFor={sportId}>Activity type</Label>
            <Select value={sport} onValueChange={setSport} disabled={busy || loadRefresh === "refreshing"}>
              <SelectTrigger id={sportId} className="mt-1 min-h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="walking">Walking</SelectItem>
                <SelectItem value="cycling">Cycling</SelectItem>
                <SelectItem value="swimming">Swimming</SelectItem>
                <SelectItem value="strength">Strength</SelectItem>
                <SelectItem value="triathlon">Triathlon</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" disabled={busy || loadRefresh === "refreshing" || fileList.length === 0} className="min-h-11 w-full">
            {buttonLabel}
          </Button>

          {status && (
            <div role="status" aria-live="polite" className={`p-3 rounded-md text-xs border ${
              status.type === "error"
                ? "bg-destructive/10 border-destructive/30 text-destructive"
                : status.type === "warning"
                ? "bg-warning/10 border-warning/30 text-warning"
                : "bg-success/10 border-success/30 text-success"
            }`}>
              {status.message}
            </div>
          )}

          {resultsSummary && (
            <div className="space-y-2 border-t pt-3 mt-3">
              {(resultsSummary.created > 0 || resultsSummary.duplicates > 0 || resultsSummary.errors.length > 0) && (
                <div className="flex flex-wrap gap-2">
                  {resultsSummary.workoutId && (
                    <Button asChild size="sm"><Link to={`/workouts/${resultsSummary.workoutId}`}>Review imported workout</Link></Button>
                  )}
                  <Button asChild variant="outline" size="sm"><Link to="/workouts">Open workout history</Link></Button>
                </div>
              )}
              {loadRefresh && (
                <div role="status" className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {loadRefresh === "refreshing" && <span>Updating training load…</span>}
                  {loadRefresh === "complete" && <span>Training load updated.</span>}
                  {loadRefresh === "failed" && <>
                    <span>Workouts saved. Training load could not be refreshed.</span>
                    <Button type="button" variant="outline" size="sm" onClick={refreshTrainingLoad}>Retry training load</Button>
                  </>}
                </div>
              )}

              {resultsSummary.errors.length > 0 && (
                <div className="mt-2">
                  <span className="text-xs font-medium text-destructive">Files to review</span>
                  <ul className="text-xs text-muted-foreground space-y-1 mt-1 max-h-32 overflow-y-auto border border-border rounded p-2 bg-muted/30">
                    {resultsSummary.errors.map((f, i) => (
                      <li key={i} className="flex flex-col gap-1 border-b border-border pb-1 last:border-none sm:flex-row sm:justify-between">
                        <span className="min-w-0 break-words font-medium text-foreground">{f.file_name}</span>
                        <span className="min-w-0 break-words text-destructive">{f.error}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
