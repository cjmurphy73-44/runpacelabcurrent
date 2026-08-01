import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { History } from "lucide-react";

export default function BulkWorkoutImport({ athleteId, onUploaded }) {
  const [fileList, setFileList] = useState([]);
  const [sport, setSport] = useState("running");
  const [status, setStatus] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (fileList.length === 0) return;
    setUploading(true);
    setStatus(null);
    try {
      const uploaded = await Promise.all(
        fileList.map(async (file) => {
          const { file_url } = await base44.integrations.Core.UploadFile({ file });
          return { file_url, file_name: file.name, sport };
        })
      );
      const res = await base44.functions.invoke("bulkIngestWorkouts", { athlete_id: athleteId, files: uploaded });
      const data = res.data;
      if (!data.success) {
        setStatus({ type: "error", message: data.error || "Import failed." });
      } else {
        const failCount = data.errors?.length || 0;
        setStatus({
          type: failCount > 0 ? "warning" : "success",
          message: `Imported ${data.created_count} workout(s).${failCount ? ` ${failCount} file(s) failed.` : ""}`,
        });
        setFileList([]);
        onUploaded();
      }
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    }
    setUploading(false);
  };

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
              onChange={(e) => setFileList(Array.from(e.target.files || []))}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">Dates are read automatically from each file's recorded timestamps.</p>
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
              Multi-activity exports (e.g. Coros, Garmin) have their sport detected automatically per activity — running, cycling, swimming, strength, and more. This is only used when a file doesn't include an activity type.
            </p>
          </div>
          <Button type="submit" disabled={uploading || fileList.length === 0} className="w-full">
            {uploading ? `Importing ${fileList.length} file(s)...` : `Import ${fileList.length || ""} file(s)`}
          </Button>
          {status && (
            <p className={`text-sm ${status.type === "error" ? "text-destructive" : status.type === "warning" ? "text-amber-500" : "text-primary"}`}>
              {status.message}
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}