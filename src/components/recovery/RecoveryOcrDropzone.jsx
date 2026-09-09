import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Image } from "@/components/ui/image";
import { Loader2, UploadCloud, Image as ImageIcon, CheckCircle2, AlertTriangle, X } from "lucide-react";
import { useFitness } from "@/context/FitnessContext";

let uid = 0;

const FIELDS = [
  { key: "date", label: "Date", type: "date" },
  { key: "hrv", label: "HRV (ms)", type: "number" },
  { key: "sleep_score", label: "Sleep score", type: "number" },
  { key: "sleep_duration_hours", label: "Sleep (hrs)", type: "number" },
  { key: "resting_hr", label: "Resting HR (bpm)", type: "number" },
  { key: "readiness_score", label: "Readiness score", type: "number" },
];

export default function RecoveryOcrDropzone({ athleteId }) {
  const { reload } = useFitness();
  const inputRef = useRef(null);
  const [queue, setQueue] = useState([]);
  const [activeId, setActiveId] = useState(null);

  async function processFile(file) {
    const id = ++uid;
    setQueue((q) => [...q, { id, name: file.name, status: "uploading" }]);
    try {
      const upload = await base44.integrations.Core.UploadFile({ file });
      const image_url = upload?.file_url;
      if (!image_url) throw new Error("Upload failed — no file URL returned.");
      setQueue((q) => q.map((it) => (it.id === id ? { ...it, image_url, status: "reading" } : it)));
      const res = await base44.functions.invoke("parseRecoveryScreenshot", { image_url });
      const parsed = res?.data;
      if (!parsed) throw new Error("OCR returned no data.");
      setQueue((q) => q.map((it) => (it.id === id ? { ...it, parsed, status: "ready" } : it)));
    } catch (e) {
      setQueue((q) => q.map((it) => (it.id === id ? { ...it, status: "error", error: e?.message || "Failed" } : it)));
    }
  }

  function handleFiles(files) {
    Array.from(files || []).forEach(processFile);
  }

  const activeItem = queue.find((it) => it.id === activeId) || null;

  function dismissItem(id) {
    setQueue((q) => q.filter((it) => it.id !== id));
    if (activeId === id) setActiveId(null);
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-heading flex items-center gap-2">
            <ImageIcon className="w-4 h-4" /> OCR recovery screenshot
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div
            onClick={() => inputRef.current?.click()}
            className="cursor-pointer rounded-lg border-2 border-dashed border-border hover:border-primary/60 hover:bg-accent/40 transition-colors p-5 flex flex-col items-center justify-center text-center gap-1.5 min-h-[130px]"
          >
            <UploadCloud className="w-5 h-5 text-muted-foreground" />
            <p className="text-sm font-medium">Drop a recovery screenshot</p>
            <p className="text-xs text-muted-foreground">WHOOP, Oura, Garmin, Apple Health — review & save</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
          />
          {queue.length > 0 && (
            <div className="space-y-1.5">
              {queue.map((it) => (
                <div key={it.id} className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5 text-xs">
                  <ImageIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate flex-1" title={it.name}>{it.name}</span>
                  {it.status === "uploading" && <span className="text-muted-foreground">Uploading…</span>}
                  {it.status === "reading" && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
                  {it.status === "ready" && (
                    <button onClick={() => setActiveId(it.id)} className="text-primary hover:underline">Review</button>
                  )}
                  {it.status === "saved" && (
                    <span className="inline-flex items-center gap-1 text-accent-emerald">
                      <CheckCircle2 className="w-3.5 h-3.5" /> saved
                    </span>
                  )}
                  {it.status === "error" && (
                    <span className="inline-flex items-center gap-1 text-destructive" title={it.error}>
                      <AlertTriangle className="w-3 h-3" /> error
                    </span>
                  )}
                  {it.status !== "uploading" && it.status !== "reading" && (
                    <button onClick={() => dismissItem(it.id)} className="text-muted-foreground hover:text-foreground ml-1" aria-label="Dismiss">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {activeItem && (
        <RecoveryOcrModal
          key={activeItem.id}
          open
          image_url={activeItem.image_url}
          parsed={activeItem.parsed}
          athleteId={athleteId}
          onClose={() => setActiveId(null)}
          onSaved={() => {
            setQueue((q) => q.map((it) => (it.id === activeItem.id ? { ...it, status: "saved" } : it)));
            reload();
          }}
        />
      )}
    </>
  );
}

function RecoveryOcrModal({ open, image_url, parsed, athleteId, onClose, onSaved }) {
  const [form, setForm] = useState(() => buildForm(parsed));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  React.useEffect(() => {
    if (open) { setForm(buildForm(parsed)); setError(null); setDone(false); }
  }, [open, parsed]);

  const flagged = new Set(parsed?.flagged_fields || []);
  const lowConfidence = Number(parsed?.confidence_score ?? 1) < 0.85;

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function handleConfirm() {
    setError(null);
    setSaving(true);
    try {
      const payload = {};
      for (const f of FIELDS) {
        if (f.key === "date") continue;
        if (form[f.key] !== "" && form[f.key] != null) payload[f.key] = Number(form[f.key]);
      }
      const date = form.date || new Date().toISOString().slice(0, 10);
      const existing = await base44.entities.DailyMetrics.filter({ athlete_id: athleteId, date }, "-date", 1);
      if (existing.length > 0) {
        await base44.entities.DailyMetrics.update(existing[0].id, payload);
      } else {
        await base44.entities.DailyMetrics.create({ athlete_id: athleteId, date, ...payload });
      }
      setDone(true);
      onSaved?.();
      setTimeout(() => onClose?.(), 700);
    } catch (e) {
      setError(e?.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="max-w-3xl max-h-[calc(100dvh-1.5rem)] overflow-y-auto">
        <DialogHeader><DialogTitle>Verify Recovery Metrics</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Original Screenshot</Label>
            <div className="rounded-lg border border-border overflow-hidden bg-muted/30">
              {image_url ? (
                <Image src={image_url} alt="Recovery screenshot" className="w-full max-h-[420px] object-contain" fittingType="fit" />
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
          <div className="space-y-3">
            {FIELDS.map((f) => {
              const isFlagged = flagged.has(f.key) || (lowConfidence && f.key !== "date");
              return (
                <div key={f.key} className="space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    {f.label}
                    {isFlagged && <AlertTriangle className="w-3 h-3 text-accent-amber" />}
                  </Label>
                  <Input
                    type={f.type}
                    value={form[f.key] ?? ""}
                    onChange={(e) => setField(f.key, e.target.value)}
                    className={`font-mono ${isFlagged ? "border-accent-amber ring-1 ring-accent-amber/40" : "border-input"}`}
                  />
                </div>
              );
            })}
            {error && <p className="text-sm text-destructive">{error}</p>}
            {done && (
              <p className="text-sm text-accent-emerald inline-flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Saved
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
    date: parsed?.date || new Date().toISOString().slice(0, 10),
    hrv: parsed?.hrv ?? "",
    sleep_score: parsed?.sleep_score ?? "",
    sleep_duration_hours: parsed?.sleep_duration_hours ?? "",
    resting_hr: parsed?.resting_hr ?? "",
    readiness_score: parsed?.readiness_score ?? "",
  };
}