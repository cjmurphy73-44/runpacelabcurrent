import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { singleFileImportOutcome } from "@/lib/singleFileImportOutcome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UploadCloud } from "lucide-react";

// Local-calendar YYYY-MM-DD. Date.toISOString() is UTC, so a morning upload in
// UTC+10 (Brisbane) would otherwise default to the previous day.
function todayLocalISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function WorkoutUpload({ athleteId, onUploaded }) {
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);
  const submitInFlightRef = useRef(false);
  const [sport, setSport] = useState("running");
  const [date, setDate] = useState(todayLocalISO());
  const [status, setStatus] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || submitInFlightRef.current) return;
    submitInFlightRef.current = true;
    setUploading(true);
    setStatus(null);
    let ingestRequested = false;
    try {
      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      const file_url = uploadResult?.file_url;
      // A completed transport call without a usable file URL is not an ingest.
      // Fail before invoking the server rather than sending an undefined source.
      if (typeof file_url !== "string" || !file_url.trim()) {
        throw new Error("Upload returned no usable file URL");
      }
      // Once the ingest request begins, a rejected promise does not prove that
      // the server did not save the workout. Never encourage a blind retry.
      ingestRequested = true;
      const res = await base44.functions.invoke("ingestWorkoutFile", {
        athlete_id: athleteId,
        file_url,
        file_name: file.name,
        sport,
        date,
      });
      const outcome = singleFileImportOutcome(res?.data, file.name);
      setStatus({ type: outcome.type, message: outcome.message });
      if (outcome.confirmed) {
        setFile(null);
        // Clear the actual native input too: otherwise the same FIT cannot be
        // selected again and the UI may still show the previous filename.
        if (fileInputRef.current) fileInputRef.current.value = "";
        // Parent refresh failures must not misreport a confirmed saved workout.
        try {
          await onUploaded?.();
        } catch {
          // The confirmed save status remains authoritative.
        }
      }
    } catch (err) {
      setStatus({
        type: ingestRequested ? "warning" : "error",
        message: ingestRequested
          ? "Workout save could not be confirmed. Check your workout history before retrying to avoid a duplicate. Your selected file is still available."
          : "File upload failed before workout processing began. Check your connection and retry. Your selected file is still available.",
      });
    }
    submitInFlightRef.current = false;
    setUploading(false);
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm font-heading flex items-center gap-2"><UploadCloud className="w-4 h-4" /> Upload workout</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="workout-upload-file">File (.fit or .csv)</Label>
            <Input id="workout-upload-file" ref={fileInputRef} type="file" accept=".fit,.csv,application/vnd.ant.fit,application/octet-stream" onChange={(e) => setFile(e.target.files?.[0] || null)} required />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label id="workout-upload-sport-label">Sport</Label>
              <Select value={sport} onValueChange={setSport}>
                <SelectTrigger aria-labelledby="workout-upload-sport-label"><SelectValue /></SelectTrigger>
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
            <div>
              <Label htmlFor="workout-upload-date">Date</Label>
              <Input id="workout-upload-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} max={todayLocalISO()} required />
            </div>
          </div>
          <Button type="submit" disabled={uploading || !file} className="w-full">
            {uploading ? "Processing..." : "Upload"}
          </Button>
          {status && (
            <p role="status" aria-live="polite" className={`text-sm ${status.type === "error" ? "text-destructive" : status.type === "warning" ? "text-warning" : "text-success"}`}>{status.message}</p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}