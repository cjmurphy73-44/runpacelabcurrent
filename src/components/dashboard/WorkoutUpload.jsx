import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
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
  const [sport, setSport] = useState("running");
  const [date, setDate] = useState(todayLocalISO());
  const [status, setStatus] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setStatus(null);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const res = await base44.functions.invoke("ingestWorkoutFile", {
        athlete_id: athleteId,
        file_url,
        file_name: file.name,
        sport,
        date,
      });
      if (res.data?.error) {
        setStatus({ type: "error", message: res.data.error });
      } else {
        setStatus({ type: "success", message: "Workout ingested successfully." });
        setFile(null);
        onUploaded();
      }
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    }
    setUploading(false);
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm font-heading flex items-center gap-2"><UploadCloud className="w-4 h-4" /> Upload workout</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label>File (.fit or .csv)</Label>
            <Input type="file" accept=".fit,.csv,application/vnd.ant.fit,application/octet-stream" onChange={(e) => setFile(e.target.files?.[0] || null)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Sport</Label>
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
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} max={todayLocalISO()} required />
            </div>
          </div>
          <Button type="submit" disabled={uploading || !file} className="w-full">
            {uploading ? "Processing..." : "Upload"}
          </Button>
          {status && (
            <p className={`text-sm ${status.type === "error" ? "text-destructive" : "text-green-600"}`}>{status.message}</p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}