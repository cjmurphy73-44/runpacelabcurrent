import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { History, FolderOpen } from "lucide-react";
import { parseFitSummary } from "@/lib/fitSummaryParser";
import { parseCSV } from "@/lib/telemetryParser";

const CHUNK_SIZE = 100;
const VALID_SPORTS = ["running", "cycling", "swimming", "strength", "triathlon", "other"];

function isSupportedFile(name) {
  const lower = name.toLowerCase();
  return lower.endsWith(".fit") || lower.endsWith(".csv");
}

// Guards against sending malformed rows that the backend would reject with a 400 —
// every summary must have a real ISO date, a positive duration, and a recognized sport.
function summaryValidationError(summary) {
  if (!summary.date || isNaN(Date.parse(summary.date))) return "Missing or invalid date";
  if (!summary.duration_seconds || summary.duration_seconds <= 0) return "Duration must be greater than 0";
  if (!summary.sport || !VALID_SPORTS.includes(summary.sport)) return "Invalid or unrecognized sport";
  return null;
}

export default function BulkWorkoutImport({ athleteId, onUploaded }) {
  const [fileList, setFileList] = useState([]);
  const [sport, setSport] = useState("running");
  const [status, setStatus] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(null); // { phase: 'compiling'|'sending', current, total }
  const [failedFiles, setFailedFiles] = useState([]);
  const folderInputRef = useRef(null);

  const addFiles = (fileArray) => setFileList(fileArray.filter((f) => isSupportedFile(f.name)));

  // Parses a single file locally in the browser into a compact session-summary row.
  const parseFileToSummary = async (file) => {
    const lower = file.name.toLowerCase();
    if (lower.endsWith(".fit")) {
      const buffer = await file.arrayBuffer();
      const parsed = parseFitSummary(buffer);
      if (!parsed) return null;
      return {
        file_name: file.name,
        date: parsed.timestamp.split("T")[0],
        sport: parsed.sport && parsed.sport !== "other" ? parsed.sport : sport,
        duration_seconds: Math.round(parsed.total_elapsed_time),
        distance_km: Math.round((parsed.total_distance_meters / 1000) * 100) / 100,
        avg_hr: parsed.avg_heart_rate || undefined,
        max_hr: parsed.max_heart_rate || undefined,
        source_format: "fit",
      };
    }
    const text = await file.text();
    const parsed = parseCSV(text);
    if (!parsed || !parsed.duration_seconds) return null;
    return {
      file_name: file.name,
      date: parsed.date,
      sport: parsed.sport || sport,
      duration_seconds: Math.round(parsed.duration_seconds),
      distance_km: Math.round((parsed.distance_km || 0) * 100) / 100,
      avg_hr: parsed.avg_hr || undefined,
      max_hr: parsed.max_hr || undefined,
      source_format: "csv",
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (fileList.length === 0) return;
    setUploading(true);
    setStatus(null);
    setFailedFiles([]);

    // Phase 1: compile every file into a summary row entirely in the browser.
    // Each file is parsed independently so one corrupt/unreadable file never aborts the rest of the batch.
    const summaries = [];
    const parseErrors = [];
    for (let i = 0; i < fileList.length; i++) {
      setProgress({ phase: "compiling", current: i + 1, total: fileList.length });
      try {
        const summary = await parseFileToSummary(fileList[i]);
        if (summary) summaries.push(summary);
        else parseErrors.push({ file_name: fileList[i].name, error: "Could not extract a summary" });
      } catch (err) {
        console.error(`Bulk import: failed to parse ${fileList[i].name}:`, err.message);
        parseErrors.push({ file_name: fileList[i].name, error: err.message });
      }
    }

    // Sanitize: drop any summary missing a valid date/duration/sport so the batch payload
    // sent to the backend never contains a row that would trigger a 400 Bad Request.
    const validSummaries = [];
    for (const summary of summaries) {
      const error = summaryValidationError(summary);
      if (error) parseErrors.push({ file_name: summary.file_name, error });
      else validSummaries.push(summary);
    }

    if (parseErrors.length > 0) setFailedFiles(parseErrors);

    if (validSummaries.length === 0) {
      setStatus({ type: "error", message: "No files could be compiled into workout summaries." });
      setUploading(false);
      setProgress(null);
      return;
    }

    // Phase 2: send the compiled master log to the backend in chunks.
    try {
      let createdCount = 0;
      const serverErrors = [];
      const totalBatches = Math.ceil(validSummaries.length / CHUNK_SIZE);
      for (let b = 0; b < totalBatches; b++) {
        setProgress({ phase: "sending", current: b + 1, total: totalBatches });
        const chunk = validSummaries.slice(b * CHUNK_SIZE, (b + 1) * CHUNK_SIZE);
        const res = await base44.functions.invoke("bulkIngestWorkouts", { athlete_id: athleteId, summaries: chunk });
        const data = res.data;
        if (data.success) {
          createdCount += data.created_count || 0;
          serverErrors.push(...(data.errors || []));
        } else {
          serverErrors.push({ file_name: "batch", error: data.error || "Batch failed" });
        }
      }
      if (serverErrors.length > 0) setFailedFiles((prev) => [...prev, ...serverErrors]);

      const failCount = parseErrors.length + serverErrors.length;
      setStatus({
        type: failCount > 0 ? "warning" : "success",
        message: `Imported ${createdCount} workout(s) from ${validSummaries.length} compiled file(s).${failCount ? ` ${failCount} file(s) failed.` : ""}`,
      });
      setFileList([]);
      onUploaded();
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    }
    setUploading(false);
    setProgress(null);
  };

  const buttonLabel = progress
    ? progress.phase === "compiling"
      ? `Compiling ${progress.total} files locally in browser... [${progress.current}/${progress.total}]`
      : `Uploading batch ${progress.current}/${progress.total}...`
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
              accept=".fit,.csv"
              multiple
              onChange={(e) => addFiles(Array.from(e.target.files || []))}
            />
            <input
              ref={folderInputRef}
              type="file"
              webkitdirectory=""
              directory=""
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
              Files are compiled locally in your browser before uploading — nothing is sent until import.
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
          <Button type="submit" disabled={uploading || fileList.length === 0} className="w-full">
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