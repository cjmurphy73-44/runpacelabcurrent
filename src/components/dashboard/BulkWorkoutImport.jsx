import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { History, FolderOpen, CheckCircle2, AlertTriangle, XCircle, FileCode } from "lucide-react";

const BATCH_SIZE = 5;

function isSupportedFile(name) {
  const lower = name.toLowerCase();
  return lower.endsWith(".fit") || lower.endsWith(".csv") || lower.endsWith(".gpx") || lower.endsWith(".tcx");
}

export default function BulkWorkoutImport({ athleteId, onUploaded }) {
  const [fileList, setFileList] = useState([]);
  const [skippedCount, setSkippedCount] = useState(0);
  const [sport, setSport] = useState("running");
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(null); // { phase, current, total }
  const [resultsSummary, setResultsSummary] = useState(null); // { created, duplicates, errors }
  const folderInputRef = useRef(null);

  const addFiles = (fileArray) => {
    const valid = fileArray.filter((f) => isSupportedFile(f.name));
    const skipped = fileArray.length - valid.length;
    setFileList(valid);
    setSkippedCount(skipped);
    setStatus(null);
    setResultsSummary(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (fileList.length === 0) return;
    if (!athleteId) {
      setStatus({ type: "error", message: "No athlete profile found. Create your athlete profile before importing workouts." });
      return;
    }
    setBusy(true);
    setStatus(null);
    setResultsSummary(null);

    let createdCount = 0;
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
        const data = res.data;
        if (data?.success) {
          createdCount += data.created_count || 0;
          duplicateCount += data.duplicate_count || 0;
          if (data.errors) allErrors.push(...data.errors);
        } else {
          allErrors.push({ file_name: `Batch ${b + 1}`, error: data?.error || "Batch execution failed" });
        }
      } catch (err) {
        allErrors.push({ file_name: `Batch ${b + 1}`, error: err.message });
      }
    }

    setResultsSummary({
      created: createdCount,
      duplicates: duplicateCount,
      errors: allErrors,
      total: fileList.length,
    });

    setStatus({
      type: allErrors.length > 0 ? "warning" : "success",
      message: `Batch ingestion completed: ${createdCount} created, ${duplicateCount} duplicates skipped, ${allErrors.length} errors.`,
    });

    setFileList([]);
    if (onUploaded) onUploaded();
    setBusy(false);
    setProgress(null);
  };

  const buttonLabel = progress
    ? `Processing Batch ${progress.current}/${progress.total}...`
    : `Import ${fileList.length || ""} File(s)`;

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-heading flex items-center gap-2">
          <History className="w-4 h-4 text-primary" /> Bulk Workout Ingestion
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-xs font-semibold">Select Activity Files (.fit, .gpx, .tcx, .csv)</Label>
            <div className="mt-1.5 flex flex-col gap-2">
              <Input
                type="file"
                accept=".fit,.gpx,.tcx,.csv,application/vnd.ant.fit,application/octet-stream"
                multiple
                onChange={(e) => addFiles(Array.from(e.target.files || []))}
                className="text-xs"
              />
              <input
                ref={folderInputRef}
                type="file"
                webkitdirectory=""
                multiple
                className="hidden"
                onChange={(e) => addFiles(Array.from(e.target.files || []))}
              />
              <button
                type="button"
                onClick={() => folderInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline w-fit"
              >
                <FolderOpen className="w-3.5 h-3.5" /> Select Entire Directory / Folder
              </button>
            </div>
            {skippedCount > 0 && (
              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Skipped {skippedCount} unsupported file(s).
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {fileList.length > 0 ? `${fileList.length} supported file(s) ready for server parsing. ` : ""}
              Files are sanitized and deduplicated against your master workout log.
            </p>
          </div>

          <div>
            <Label className="text-xs font-semibold">Fallback Sport</Label>
            <Select value={sport} onValueChange={setSport}>
              <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="cycling">Cycling</SelectItem>
                <SelectItem value="swimming">Swimming</SelectItem>
                <SelectItem value="strength">Strength</SelectItem>
                <SelectItem value="triathlon">Triathlon</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" disabled={busy || fileList.length === 0} className="w-full text-xs h-9">
            {buttonLabel}
          </Button>

          {status && (
            <div className={`p-3 rounded-md text-xs border ${
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
              <span className="text-xs font-semibold text-foreground">Import Outcome Breakdown:</span>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 bg-success/10 text-success rounded border border-success/20">
                  <CheckCircle2 className="w-3.5 h-3.5 mx-auto mb-0.5" />
                  <span className="font-bold">{resultsSummary.created}</span> Created
                </div>
                <div className="p-2 bg-muted text-muted-foreground rounded border border-border">
                  <FileCode className="w-3.5 h-3.5 mx-auto mb-0.5" />
                  <span className="font-bold">{resultsSummary.duplicates}</span> Duplicates
                </div>
                <div className="p-2 bg-destructive/10 text-destructive rounded border border-destructive/20">
                  <XCircle className="w-3.5 h-3.5 mx-auto mb-0.5" />
                  <span className="font-bold">{resultsSummary.errors.length}</span> Failed
                </div>
              </div>

              {resultsSummary.errors.length > 0 && (
                <div className="mt-2">
                  <span className="text-xs font-medium text-destructive">Failed Files Detail:</span>
                  <ul className="text-xs text-muted-foreground space-y-1 mt-1 max-h-32 overflow-y-auto border border-border rounded p-2 bg-muted/30">
                    {resultsSummary.errors.map((f, i) => (
                      <li key={i} className="flex justify-between gap-2 border-b border-border last:border-none pb-0.5">
                        <span className="font-medium text-foreground truncate">{f.file_name}:</span>
                        <span className="text-destructive shrink-0">{f.error}</span>
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