import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { History, FolderOpen } from "lucide-react";

// Files are parsed on the backend by the fit-file-parser library (not hand-rolled in the browser),
// which reliably extracts session-level summaries. Backend rejects any session under 60s or over
// 24h and dedups against the existing master log (WorkoutSession), so every accepted row is real.
const BATCH_SIZE = 5;

function isSupportedFile(name) {
  const lower = name.toLowerCase();
  return lower.endsWith(".fit") || lower.endsWith(".csv");
}

export default function BulkWorkoutImport({ athleteId, onUploaded }) {
  const [fileList, setFileList] = useState([]);
  const [sport, setSport] = useState("running");
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(null); // { phase, current, total }
  const [failedFiles, setFailedFiles] = useState([]);
  const folderInputRef = useRef(null);

  const addFiles = (fileArray) => setFileList(fileArray.filter((f) => isSupportedFile(f.name)));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (fileList.length === 0) return;
    if (!athleteId) {
      setStatus({ type: "error", message: "No athlete profile found. Create your athlete profile before importing workouts." });
      return;
    }
    setBusy(true);
    setStatus(null);
    setFailedFiles([]);

    let createdCount = 0;
    const allErrors = [];
    const totalBatches = Math.ceil(fileList.length / BATCH_SIZE);

    for (let b = 0; b < totalBatches; b++) {
      setProgress({ phase: "importing", current: b + 1, total: totalBatches });
      const batch = fileList.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);
      try {
        // Upload each file, then let the backend parse it with fit-file-parser.
        const fileEntries = [];
        for (const f of batch) {
          const { file_url } = await base44.integrations.Core.UploadFile({ file: f });
          fileEntries.push({ file_url, file_name: f.name, sport });
        }
        const res = await base44.functions.invoke("bulkIngestWorkouts", { athlete_id: athleteId, files: fileEntries });
        const data = res.data;
        if (data?.success) {
          createdCount += data.created_count || 0;
          if (data.errors) allErrors.push(...data.errors);
        } else {
          allErrors.push({ file_name: `batch ${b + 1}`, error: data?.error || "Batch failed" });
        }
      } catch (err) {
        allErrors.push({ file_name: `batch ${b + 1}`, error: err.message });
      }
    }

    if (allErrors.length > 0) setFailedFiles(allErrors);
    setStatus({
      type: allErrors.length > 0 ? "warning" : "success",
      message: `Imported ${createdCount} workout(s) from ${fileList.length} file(s).${allErrors.length ? ` ${allErrors.length} error(s).` : ""}`,
    });
    setFileList([]);
    onUploaded();
    setBusy(false);
    setProgress(null);
  };

  const buttonLabel = progress
    ? `Importing batch ${progress.current}/${progress.total}...`
    : `Import ${fileList.length || ""} file(s)`;

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm font-heading flex items-center gap-2"><History className="w-4 h-4" /> Bulk import history</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label>Files (.fit or .csv, multiple)</Label>
            <Input
              type="file"
              accept=".fit,.csv,application/vnd.ant.fit,application/octet-stream"
              multiple
              onChange={(e) => addFiles(Array.from(e.target.files || []))}
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
              className="mt-2 inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              <FolderOpen className="w-3.5 h-3.5" /> Or select an entire folder
            </button>
            <p className="text-xs text-muted-foreground mt-1">
              {fileList.length > 0 ? `${fileList.length} file(s) selected. ` : ""}
              Files are parsed on the server with a dedicated FIT parser, then saved to your master workout log.
            </p>
          </div>
          <div>
            <Label>Fallback sport</Label>
            <Select value={sport} onValueChange={setSport}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="cycling">Cycling</SelectItem>
                <SelectItem value="swimming">Swimming</SelectItem>
                <SelectItem value="strength">Strength</SelectItem>
                <SelectItem value="triathlon">Triathlon</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Used when a file's sport can't be detected automatically (mainly .csv files).
            </p>
          </div>
          <Button type="submit" disabled={busy || fileList.length === 0} className="w-full">
            {buttonLabel}
          </Button>
          {status && (
            <p className={`text-sm ${status.type === "error" ? "text-destructive" : status.type === "warning" ? "text-amber-500" : "text-primary"}`}>
              {status.message}
            </p>
          )}
          {failedFiles.length > 0 && (
            <ul className="text-xs text-muted-foreground space-y-0.5 max-h-28 overflow-y-auto border border-border rounded-md p-2">
              {failedFiles.map((f, i) => (
                <li key={i}><span className="font-medium">{f.file_name}:</span> {f.error}</li>
              ))}
            </ul>
          )}
        </form>
      </CardContent>
    </Card>
  );
}