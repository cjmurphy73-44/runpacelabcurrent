import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { UploadCloud } from "lucide-react";
import { useFitness } from "@/context/FitnessContext";

const HEADER_ALIASES = {
  date: ["date"],
  hrv: ["hrv", "hrv_ms", "heart rate variability"],
  sleep_score: ["sleep_score", "sleep score"],
};

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

export default function RecoveryCsvDropzone({ athleteId }) {
  const { reload } = useFitness();
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState(null);

  const processFile = async (file) => {
    setStatus(null);
    const text = await file.text();
    let rows = [];
    try {
      rows = file.name.toLowerCase().endsWith(".json") ? parseJson(text) : parseCsv(text);
    } catch (e) {
      setStatus({ type: "error", message: "Could not parse file: " + e.message });
      return;
    }

    const parsed = rows
      .filter((r) => r.date)
      .map((r) => {
        const rec = { date: r.date };
        if (r.hrv !== undefined && r.hrv !== "") rec.hrv = Number(r.hrv);
        if (r.sleep_score !== undefined && r.sleep_score !== "") rec.sleep_score = Number(r.sleep_score);
        return rec;
      })
      .filter((r) => r.hrv !== undefined || r.sleep_score !== undefined);

    if (parsed.length === 0) {
      setStatus({ type: "error", message: "No valid rows found (need at least a date plus HRV or sleep score)." });
      return;
    }

    try {
      // UPSERT into DailyMetrics per date — never touch the computed total_trimp / ctl / atl / tsb,
      // which recalculateCTLATLTSB owns.
      const existing = await base44.entities.DailyMetrics.filter({ athlete_id: athleteId }, "-date", 2000);
      const byDate = new Map(existing.map((m) => [m.date, m.id]));
      const updates = [];
      const creates = [];
      for (const r of parsed) {
        const payload = {};
        if (r.hrv !== undefined) payload.hrv = r.hrv;
        if (r.sleep_score !== undefined) payload.sleep_score = r.sleep_score;
        if (byDate.has(r.date)) {
          updates.push({ id: byDate.get(r.date), ...payload });
        } else {
          creates.push({ athlete_id: athleteId, date: r.date, ...payload });
        }
      }
      if (updates.length) await base44.entities.DailyMetrics.bulkUpdate(updates);
      if (creates.length) await base44.entities.DailyMetrics.bulkCreate(creates);
      await reload();
      setStatus({ type: "success", message: `Synced ${parsed.length} recovery record(s) — ${updates.length} updated, ${creates.length} new.` });
    } catch (e) {
      setStatus({ type: "error", message: "Import failed: " + e.message });
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-6 text-center text-sm transition-colors ${dragging ? "border-primary bg-primary/5" : "border-border"}`}
      >
        <UploadCloud className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
        <p className="text-muted-foreground">Drag & drop a CSV or JSON export (HRV, Sleep Score)</p>
        <label className="inline-block mt-2 text-primary text-xs cursor-pointer underline">
          or choose a file
          <input
            type="file"
            accept=".csv,.json"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
          />
        </label>
      </div>
      {status && (
        <p className={`text-xs ${status.type === "error" ? "text-destructive" : "text-primary"}`}>{status.message}</p>
      )}
    </div>
  );
}