import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { UploadCloud } from "lucide-react";
import { useFitness } from "@/context/FitnessContext";

const HEADER_ALIASES = {
  date: ["date", "day"],
  hrv: ["hrv", "hrv_ms", "heart rate variability"],
  hrv_score: ["hrv_score", "hrv score"],
  sleep_score: ["sleep_score", "sleep score", "sleep"],
  resting_hr: ["resting_hr", "resting heart rate", "rhr", "resting_hr_bpm"],
  readiness_score: ["readiness_score", "readiness", "readiness score"],
};

const NUMERIC_FIELDS = ["hrv", "hrv_score", "sleep_score", "resting_hr", "readiness_score"];

function matchHeader(header) {
  const h = header.trim().toLowerCase();
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.includes(h)) return field;
  }
  return null;
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => matchHeader(h));
  return lines.slice(1).map((line) => {
    const cells = line.split(",");
    const row = {};
    headers.forEach((field, idx) => {
      if (field) row[field] = cells[idx]?.trim();
    });
    return row;
  });
}

function parseJson(text) {
  const data = JSON.parse(text);
  const rows = Array.isArray(data) ? data : [data];
  return rows.map((r) => {
    const row = {};
    Object.entries(r).forEach(([key, value]) => {
      const field = matchHeader(key);
      if (field) row[field] = value;
    });
    return row;
  });
}

export default function RecoveryUpload({ athleteId }) {
  const { reload } = useFitness();
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setStatus(null);
    try {
      const text = await file.text();
      const rows = file.name.toLowerCase().endsWith(".json") ? parseJson(text) : parseCsv(text);

      const parsed = rows
        .filter((r) => r.date)
        .map((r) => {
          const rec = { date: r.date };
          for (const f of NUMERIC_FIELDS) {
            if (r[f] !== undefined && r[f] !== "") rec[f] = Number(r[f]);
          }
          return rec;
        })
        .filter((r) => NUMERIC_FIELDS.some((f) => r[f] !== undefined));

      if (parsed.length === 0) {
        setStatus({ type: "error", message: "No valid rows — need a date plus at least one recovery metric (HRV, sleep score, resting HR or readiness)." });
        setUploading(false);
        return;
      }

      // UPSERT recovery fields into DailyMetrics per date — never touch computed load columns.
      const existing = await base44.entities.DailyMetrics.filter({ athlete_id: athleteId }, "-date", 2000);
      const byDate = new Map(existing.map((m) => [m.date, m.id]));
      const updates = [];
      const creates = [];
      for (const r of parsed) {
        const payload = {};
        for (const f of NUMERIC_FIELDS) if (r[f] !== undefined) payload[f] = r[f];
        if (byDate.has(r.date)) updates.push({ id: byDate.get(r.date), ...payload });
        else creates.push({ athlete_id: athleteId, date: r.date, ...payload });
      }
      if (updates.length) await base44.entities.DailyMetrics.bulkUpdate(updates);
      if (creates.length) await base44.entities.DailyMetrics.bulkCreate(creates);
      await reload();
      setStatus({ type: "success", message: `Synced ${parsed.length} record(s) — ${updates.length} updated, ${creates.length} new.` });
      setFile(null);
    } catch (err) {
      setStatus({ type: "error", message: err.message || "Import failed." });
    }
    setUploading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-heading flex items-center gap-2">
          <UploadCloud className="w-4 h-4" /> Upload recovery data
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label>File (.csv or .json)</Label>
            <Input type="file" accept=".csv,.json" onChange={(e) => setFile(e.target.files?.[0] || null)} required />
          </div>
          <p className="text-xs text-muted-foreground">
            Columns: <span className="font-medium">date</span> plus any of HRV, sleep score, resting HR, readiness. Existing dates are updated, new dates are added.
          </p>
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