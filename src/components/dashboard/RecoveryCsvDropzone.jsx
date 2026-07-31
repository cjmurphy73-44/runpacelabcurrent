import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { UploadCloud } from "lucide-react";
import { useFitness } from "@/context/FitnessContext";

const HEADER_ALIASES = {
  date: ["date"],
  hrv_ms: ["hrv", "hrv_ms", "heart rate variability"],
  sleep_score: ["sleep_score", "sleep score"],
  sleep_duration_hours: ["sleep_duration_hours", "sleep hours", "sleep duration"],
  active_calories: ["active_calories", "calories", "active calories", "active_energy"],
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

    const records = rows
      .filter((r) => r.date)
      .map((r) => ({
        athlete_id: athleteId,
        date: r.date,
        hrv_ms: r.hrv_ms !== undefined ? Number(r.hrv_ms) : undefined,
        sleep_score: r.sleep_score !== undefined ? Number(r.sleep_score) : undefined,
        sleep_duration_hours: r.sleep_duration_hours !== undefined ? Number(r.sleep_duration_hours) : undefined,
        active_calories: r.active_calories !== undefined ? Number(r.active_calories) : undefined,
      }));

    if (records.length === 0) {
      setStatus({ type: "error", message: "No valid rows found (need at least a date column)." });
      return;
    }

    await base44.entities.BiometricTelemetry.bulkCreate(records);
    await reload();
    setStatus({ type: "success", message: `Imported ${records.length} biometric record(s).` });
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
        <p className="text-muted-foreground">Drag & drop a CSV or JSON export (HRV, Sleep, Calories)</p>
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