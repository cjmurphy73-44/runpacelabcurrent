import React, { useRef, useState } from "react";
import { Watch, UploadCloud, FileCheck2, Loader2, ExternalLink, Info } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Direct Garmin OAuth isn't available to consumer apps today (Garmin's developer
// program is suspended + enterprise-only), so this card is a clean, guided
// export→upload flow: everything a Garmin user needs lives in one place, no
// hunting for the Imports page. Reuses the same bulkIngestWorkouts backend as
// the bulk importer, so Garmin .fit files ingest identically.
const BATCH_SIZE = 5;
const ACCEPT = ".fit,.csv,application/vnd.ant.fit,application/octet-stream";

function isSupported(name) {
  const n = name.toLowerCase();
  return n.endsWith(".fit") || n.endsWith(".csv");
}

export default function GarminIntegration({ athleteId, onSynced }) {
  const [files, setFiles] = useState([]);
  const [sport, setSport] = useState("running");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null); // { type, message }
  const [failed, setFailed] = useState([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const addFiles = (list) => {
    const next = Array.from(list || []).filter(isSupported);
    setFiles((prev) => [...prev, ...next]);
  };

  const removeFile = (idx) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!files.length || !athleteId) return;
    setBusy(true);
    setStatus(null);
    setFailed([]);

    let created = 0;
    const errors = [];
    const totalBatches = Math.ceil(files.length / BATCH_SIZE);

    for (let b = 0; b < totalBatches; b++) {
      const batch = files.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);
      try {
        const entries = [];
        for (const f of batch) {
          const { file_url } = await base44.integrations.Core.UploadFile({ file: f });
          entries.push({ file_url, file_name: f.name, sport });
        }
        const res = await base44.functions.invoke("bulkIngestWorkouts", {
          athlete_id: athleteId,
          files: entries,
        });
        const data = res.data;
        if (data?.success) {
          created += data.created_count || 0;
          if (data.errors) errors.push(...data.errors);
        } else {
          errors.push({ file_name: `batch ${b + 1}`, error: data?.error || "Batch failed" });
        }
      } catch (err) {
        errors.push({ file_name: `batch ${b + 1}`, error: err.message });
      }
    }

    setFailed(errors);
    setStatus({
      type: errors.length ? "warning" : "success",
      message: `Imported ${created} workout${created === 1 ? "" : "s"} from ${files.length} file${files.length === 1 ? "" : "s"}.${errors.length ? ` ${errors.length} failed.` : ""}`,
    });
    if (created > 0) {
      setFiles([]);
      onSynced?.();
    }
    setBusy(false);
  };

  return (
    <div className="flex flex-col gap-4 p-4 border border-border rounded-md bg-card">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="bg-muted p-2 rounded text-muted-foreground shrink-0">
            <Watch className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium flex items-center gap-2">
              Garmin Connect
              <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                Manual upload
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              Export from Garmin Connect, drop the files here. Direct automatic sync is on the roadmap.
            </p>
          </div>
        </div>
      </div>

      {/* Why no direct sync */}
      <div className="flex gap-2 items-start text-xs text-muted-foreground bg-muted/30 border border-border rounded-md p-2.5">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <p>
          We'd love to offer one-click Garmin sync — honestly. Garmin's developer program is currently{" "}
          <span className="text-foreground font-medium">closed to new consumer apps</span> (it's enterprise-only and
          approval takes months). Until Garmin reopens it, manual export → upload is the fastest reliable path. We'll
          flip this on the moment access is possible.
        </p>
      </div>

      {/* Step 1 — Export */}
      <div className="flex gap-3 items-start">
        <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center mt-0.5">
          1
        </span>
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium">Export from Garmin Connect</p>
          <ol className="text-xs text-muted-foreground space-y-0.5 list-decimal list-inside">
            <li>
              Open{" "}
              <a
                href="https://connect.garmin.com"
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-0.5"
              >
                connect.garmin.com <ExternalLink className="w-3 h-3" />
              </a>{" "}
              → Activities
            </li>
            <li>Open an activity → <span className="font-medium text-foreground">⋯ → Export Original</span> (downloads a <span className="font-medium">.fit</span> file)</li>
            <li>Repeat for any other activities you want to import</li>
          </ol>
        </div>
      </div>

      {/* Step 2 — Upload */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-3 items-start">
          <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center mt-0.5">
            2
          </span>
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-sm font-medium">Drop your .fit files here</p>

            {/* Dropzone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`cursor-pointer rounded-md border border-dashed p-5 text-center transition-colors ${
                dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/60 hover:bg-accent/40"
              }`}
            >
              <UploadCloud className="w-6 h-6 mx-auto text-muted-foreground" />
              <p className="text-sm mt-1.5">
                <span className="text-primary font-medium">Click to browse</span> or drag .fit files here
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">.fit or .csv · multiple files supported</p>
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPT}
                multiple
                className="hidden"
                onChange={(e) => {
                  addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>

            {/* Selected files */}
            {files.length > 0 && (
              <ul className="space-y-1 max-h-32 overflow-y-auto">
                {files.map((f, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 text-xs bg-muted/40 border border-border rounded px-2 py-1.5">
                    <span className="flex items-center gap-1.5 min-w-0">
                      <FileCheck2 className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="truncate">{f.name}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="text-muted-foreground hover:text-destructive shrink-0"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div>
              <Label className="text-xs">Fallback sport (used when a file's sport can't be detected)</Label>
              <Select value={sport} onValueChange={setSport}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
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
          </div>
        </div>

        <Button type="submit" disabled={busy || files.length === 0} className="w-full sm:w-auto">
          {busy ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Importing…
            </>
          ) : (
            <>
              <UploadCloud className="w-4 h-4" /> Import {files.length || ""} file{files.length === 1 ? "" : "s"}
            </>
          )}
        </Button>

        {status && (
          <p
            className={`text-sm ${
              status.type === "warning"
                ? "text-warning"
                : status.type === "error"
                ? "text-destructive"
                : "text-success"
            }`}
          >
            {status.message}
          </p>
        )}

        {failed.length > 0 && (
          <ul className="text-xs text-muted-foreground space-y-0.5 max-h-28 overflow-y-auto border border-border rounded-md p-2">
            {failed.map((f, i) => (
              <li key={i}>
                <span className="font-medium">{f.file_name}:</span> {f.error}
              </li>
            ))}
          </ul>
        )}
      </form>
    </div>
  );
}