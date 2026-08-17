import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Image } from "@/components/ui/image";
import { AlertTriangle, Loader2, CheckCircle2 } from "lucide-react";
import { sanitize as sanitizeSession } from "@/lib/telemetry/TelemetryParser";

const SPORTS = ["running", "cycling", "swimming", "strength", "triathlon", "other"];

const FIELDS = [
  { key: "sport", label: "Activity", type: "select" },
  { key: "date", label: "Date", type: "date" },
  { key: "duration_seconds", label: "Duration (s)", type: "number" },
  { key: "distance_km", label: "Distance (km)", type: "number" },
  { key: "avg_pace_sec_km", label: "Avg Pace (s/km)", type: "number", readOnly: true },
  { key: "avg_hr", label: "Avg HR (bpm)", type: "number" },
  { key: "max_hr", label: "Max HR (bpm)", type: "number" },
  { key: "avg_power", label: "Avg Power (W)", type: "number" },
];

export default function OcrVerificationModal({ open, image_url, parsed, athleteId, onClose, onSaved }) {
  const [form, setForm] = useState(() => buildForm(parsed));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  // Re-seed the form when a new parse arrives.
  React.useEffect(() => {
    if (open) {
      setForm(buildForm(parsed));
      setError(null);
      setDone(false);
    }
  }, [open, parsed]);

  const flagged = useMemo(() => new Set(parsed?.flagged_fields || []), [parsed]);
  const lowConfidence = Number(parsed?.confidence_score ?? 1) < 0.85;
  const isFlagged = (key) => flagged.has(key) || (lowConfidence && !["sport", "date"].includes(key));

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  async function handleConfirm() {
    setError(null);
    setSaving(true);
    try {
      const row = {
        date: form.date,
        sport: SPORTS.includes(form.sport) ? form.sport : "running",
        duration_seconds: Number(form.duration_seconds) || 0,
        duration_minutes: (Number(form.duration_seconds) || 0) / 60,
        distance_km: Number(form.distance_km) || 0,
        avg_hr: form.avg_hr ? Math.round(Number(form.avg_hr)) : undefined,
        max_hr: form.max_hr ? Math.round(Number(form.max_hr)) : undefined,
        avg_power: form.avg_power ? Number(form.avg_power) : undefined,
        source_format: "webhook",
        file_name: "ocr-screenshot",
      };

      // Client-side guard via the shared TelemetryParser — rejects bogus date/duration
      // before the round-trip to the bulk-ingest backend.
      const sanitized = sanitizeSession({ athlete_id: athleteId, ...row });
      if (!sanitized) {
        throw new Error("Sanitization rejected the session — check the date and duration (must be 1 min – 24 h).");
      }

      // Persist through the existing ingestion pipeline (server-side sanitize + dedup + TRIMP).
      const res = await base44.functions.invoke("bulkIngestWorkouts", {
        athlete_id: athleteId,
        summaries: [row],
      });
      const created = Number(res?.data?.created_count || 0);
      if (created === 0) {
        const note = res?.data?.errors?.[0]?.error || "No new session created (possible duplicate).";
        throw new Error(note);
      }

      // Refresh the CTL/ATL/TSB model so the dashboard reflects the new session.
      try {
        await base44.functions.invoke("recalculateCTLATLTSB", { athlete_id: athleteId });
      } catch {
        /* recompute is best-effort; the session is already saved */
      }

      setDone(true);
      onSaved?.();
      setTimeout(() => onClose?.(), 700);
    } catch (e) {
      setError(e?.message || "Failed to save session.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="max-w-4xl max-h-[calc(100dvh-1.5rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Verify Parsed Workout</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left — original screenshot */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Original Screenshot</Label>
            <div className="rounded-lg border border-border overflow-hidden bg-muted/30">
              {image_url ? (
                <Image src={image_url} alt="Workout screenshot" className="w-full max-h-[420px] object-contain" fittingType="fit" />
              ) : (
                <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">No image</div>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>OCR confidence:</span>
              <span className={`font-mono font-semibold ${lowConfidence ? "text-accent-amber" : "text-accent-emerald"}`}>
                {Math.round((parsed?.confidence_score ?? 0) * 100)}%
              </span>
              {lowConfidence && (
                <span className="inline-flex items-center gap-1 text-accent-amber">
                  <AlertTriangle className="w-3.5 h-3.5" /> review highlighted fields
                </span>
              )}
            </div>
          </div>

          {/* Right — editable pre-filled form */}
          <div className="space-y-3">
            {FIELDS.map((f) => {
              const flaggedField = isFlagged(f.key);
              const border = flaggedField ? "border-accent-amber ring-1 ring-accent-amber/40" : "border-input";
              return (
                <div key={f.key} className="space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    {f.label}
                    {flaggedField && <AlertTriangle className="w-3 h-3 text-accent-amber" />}
                  </Label>
                  {f.type === "select" ? (
                    <Select value={form.sport} onValueChange={(v) => setField("sport", v)} disabled={f.readOnly}>
                      <SelectTrigger className={border}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SPORTS.map((s) => (
                          <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      type={f.type}
                      value={form[f.key] ?? ""}
                      onChange={(e) => setField(f.key, e.target.value)}
                      readOnly={f.readOnly}
                      className={`font-mono ${border}`}
                    />
                  )}
                </div>
              );
            })}
            {error && <p className="text-sm text-destructive">{error}</p>}
            {done && (
              <p className="text-sm text-accent-emerald inline-flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Saved — recalculating load metrics…
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm & Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function buildForm(parsed) {
  return {
    sport: parsed?.activity_type || "running",
    date: parsed?.date || new Date().toISOString().slice(0, 10),
    duration_seconds: parsed?.duration_seconds ?? "",
    distance_km: parsed?.distance_km ?? "",
    avg_pace_sec_km: parsed?.avg_pace_sec_km ?? "",
    avg_hr: parsed?.avg_hr ?? "",
    max_hr: parsed?.max_hr ?? "",
    avg_power: parsed?.avg_power ?? "",
  };
}