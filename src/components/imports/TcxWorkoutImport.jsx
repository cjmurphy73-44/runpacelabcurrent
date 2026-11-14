import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { singleImportOutcome } from "@/lib/singleImportOutcome";

function localDate() {
  const now = new Date();
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
}

// TCX goes through ingestWorkoutFile, not bulkIngestWorkouts (FIT/CSV only).
export default function TcxWorkoutImport({ athleteId }) {
  const [file, setFile] = useState(null);
  const [date, setDate] = useState(localDate);
  const [sport, setSport] = useState("running");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  async function submit(event) {
    event.preventDefault();
    if (busy || !athleteId || !file || !/\.tcx$/i.test(file.name) || !date) return;
    setBusy(true);
    setResult(null);
    try {
      const uploaded = await base44.integrations.Core.UploadFile({ file });
      if (typeof uploaded?.file_url !== "string" || !uploaded.file_url) throw new Error("File upload did not return a usable file URL.");
      const response = await base44.functions.invoke("ingestWorkoutFile", {
        athlete_id: athleteId, file_url: uploaded.file_url, file_name: file.name, date, sport,
      });
      const outcome = singleImportOutcome(response);
      setResult(outcome);
      if (outcome.ok) setFile(null);
    } catch (error) {
      setResult({ ok: false, message: error?.response?.data?.error || error?.message || "Import failed. Check your workout log before retrying." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-md border border-border p-4 space-y-3">
      <h3 className="font-semibold text-sm">Import one TCX recording</h3>
      <p className="text-xs text-muted-foreground">TCX uses the single-file parser. A successful upload alone does not confirm saved recording samples.</p>
      <label className="block text-xs font-medium" htmlFor="tcx-file">TCX file</label>
      <Input id="tcx-file" type="file" accept=".tcx,application/vnd.garmin.tcx+xml,application/xml,text/xml"
        onChange={e => { setFile(e.target.files?.[0] || null); setResult(null); }} disabled={busy} required />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="text-xs font-medium" htmlFor="tcx-date">Workout date
          <Input id="tcx-date" type="date" value={date} max={localDate()} onChange={e => setDate(e.target.value)} disabled={busy} required />
        </label>
        <label className="text-xs font-medium" htmlFor="tcx-sport">Sport
          <select id="tcx-sport" value={sport} onChange={e => setSport(e.target.value)} disabled={busy}
            className="block mt-1 min-h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
            <option value="running">Running</option><option value="cycling">Cycling</option>
            <option value="swimming">Swimming</option><option value="triathlon">Triathlon</option>
            <option value="strength">Strength</option><option value="other">Other</option>
          </select>
        </label>
      </div>
      <Button type="submit" disabled={busy || !athleteId || !file || !/\.tcx$/i.test(file.name)} className="min-h-11">
        {busy ? "Uploading and processing…" : "Import TCX recording"}
      </Button>
      {result && <div role="status" aria-live="polite" className="text-sm space-y-1">
        <p className={result.ok ? "text-foreground" : "text-destructive"}>{result.message}</p>
        <Link to="/workouts" className="text-primary underline underline-offset-2">Review workout log</Link>
      </div>}
    </form>
  );
}
