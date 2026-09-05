import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { UploadCloud, Check, Download } from "lucide-react";

// Multi-step workout log wizard (replaces the flat ManualWorkoutModal):
//  Step 1 — basic details (title, date, sport)
//  Step 2 — metrics (duration, distance, RPE) + optional file dropzone
//  Step 3 — summary preview + confirm → save → success state w/ download

const SPORTS = [
  { value: "running", label: "Run" },
  { value: "cycling", label: "Bike" },
  { value: "swimming", label: "Swim" },
  { value: "triathlon", label: "Multisport" },
  { value: "strength", label: "Strength" },
  { value: "other", label: "Other" },
];

function todayLocalISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export default function WorkoutLogWizard({ open, onClose, athleteId, onSaved }) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayLocalISO());
  const [sport, setSport] = useState("running");
  const [duration, setDuration] = useState(30);
  const [distance, setDistance] = useState("");
  const [rpe, setRpe] = useState(5);
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(null);

  const reset = () => {
    setStep(1);
    setTitle("");
    setDate(todayLocalISO());
    setSport("running");
    setDuration(30);
    setDistance("");
    setRpe(5);
    setFile(null);
    setSaved(null);
  };

  const dur = Math.max(0, Number(duration) || 0);
  const dist = Number(distance) || 0;
  const estimatedTss = Math.round(dur * Number(rpe) * 0.6);

  const step1Valid = !!date && !!sport;
  const step2Valid = file ? true : dur > 0;

  const close = () => {
    if (!saving) {
      reset();
      onClose?.();
    }
  };

  const handleConfirm = async () => {
    setSaving(true);
    try {
      let result;
      if (file) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        const res = await base44.functions.invoke("ingestWorkoutFile", {
          athlete_id: athleteId,
          file_url,
          file_name: file.name,
          sport,
          date,
        });
        result = res.data;
        if (result?.error) throw new Error(result.error);
      } else {
        const payload = {
          athlete_id: athleteId,
          date,
          sport,
          duration_minutes: dur,
          duration_seconds: dur * 60,
          source_format: "csv",
          session_trimp: 0,
          session_tss: estimatedTss,
        };
        if (dist) payload.distance_km = dist;
        await base44.entities.WorkoutSession.create(payload);
        try {
          await base44.functions.invoke("recalculateCTLATLTSB", { athlete_id: athleteId });
        } catch {
          /* non-fatal */
        }
        result = { duration_minutes: dur, session_tss: estimatedTss };
      }
      setSaved({
        date,
        sport,
        duration: file ? result.duration_minutes : dur,
        distance: dist,
        tss: result.session_tss ?? estimatedTss,
        file: file?.name,
      });
      toast({ title: "Workout saved", description: "Fitness refreshed." });
      onSaved?.();
    } catch (err) {
      toast({
        title: "Could not save workout",
        description: err?.message || "Unexpected error",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const downloadSummary = () => {
    const lines = [
      "TrainPaceLab — Workout Summary",
      "================================",
      `Title:    ${title || "(untitled)"}`,
      `Date:     ${saved.date}`,
      `Sport:    ${saved.sport}`,
      `Duration: ${saved.duration} min`,
      saved.distance ? `Distance: ${saved.distance} km` : null,
      `Est. TSS: ${saved.tss}`,
      saved.file ? `File:     ${saved.file}` : "File:     (manual entry)",
      "",
      `Logged at ${new Date().toLocaleString()}`,
    ]
      .filter(Boolean)
      .join("\n");
    const blob = new Blob([lines], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `workout-${saved.date}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const Steps = () => (
    <div className="flex items-center gap-2 mb-4">
      {[1, 2, 3].map((s) => (
        <div key={s} className="flex items-center gap-2 flex-1">
          <div
            className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${
              step >= s
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {s}
          </div>
          {s < 3 && <div className={`h-0.5 flex-1 ${step > s ? "bg-primary" : "bg-muted"}`} />}
        </div>
      ))}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{saved ? "Workout logged" : "Log a workout"}</DialogTitle>
          <DialogDescription>
            {saved
              ? "Your session has been saved."
              : "A 3-step wizard — details, metrics, then confirm."}
          </DialogDescription>
        </DialogHeader>

        {saved ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center py-4">
              <Check className="w-12 h-12 text-emerald-500" />
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Date</div>
                <div className="tabular-nums">{saved.date}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Sport</div>
                <div className="capitalize">{saved.sport}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Duration</div>
                <div className="tabular-nums">{saved.duration} min</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Est. TSS</div>
                <div className="tabular-nums">{saved.tss}</div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={downloadSummary}>
                <Download className="w-4 h-4" />
                Download summary
              </Button>
              <Button onClick={close}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <Steps />
            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="w-title">Title</Label>
                  <Input
                    id="w-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Tempo run (optional)"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="w-date">Date</Label>
                    <Input
                      id="w-date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      max={todayLocalISO()}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Sport</Label>
                    <Select value={sport} onValueChange={setSport}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SPORTS.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
            {step === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="w-dur">Duration (min)</Label>
                    <Input
                      id="w-dur"
                      type="number"
                      min={1}
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      disabled={!!file}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="w-dist">Distance (km)</Label>
                    <Input
                      id="w-dist"
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="optional"
                      value={distance}
                      onChange={(e) => setDistance(e.target.value)}
                      disabled={!!file}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="w-rpe">Perceived effort (RPE 1–10): {rpe}</Label>
                  <input
                    id="w-rpe"
                    type="range"
                    min={1}
                    max={10}
                    value={rpe}
                    onChange={(e) => setRpe(Number(e.target.value))}
                    className="w-full accent-[hsl(var(--primary))]"
                    disabled={!!file}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Workout file (optional)</Label>
                  <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-md py-6 cursor-pointer hover:bg-accent transition-colors">
                    <UploadCloud className="w-6 h-6 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {file ? file.name : "Drop or click — .fit / .csv"}
                    </span>
                    <input
                      type="file"
                      accept=".fit,.csv"
                      className="hidden"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                  </label>
                  {file && (
                    <p className="text-xs text-muted-foreground">
                      File parsed server-side — duration/distance auto-detected.
                    </p>
                  )}
                </div>
              </div>
            )}
            {step === 3 && (
              <div className="space-y-3">
                <div className="rounded-md border border-border divide-y divide-border">
                  <Row k="Title" v={title || "—"} />
                  <Row k="Date" v={date} mono />
                  <Row k="Sport" v={SPORTS.find((s) => s.value === sport)?.label} />
                  <Row k="Duration" v={file ? "from file" : `${dur} min`} mono={!file} />
                  <Row k="Distance" v={dist ? `${dist} km` : "—"} mono />
                  <Row k="RPE" v={`${rpe}`} mono />
                  <Row k="File" v={file?.name ?? "manual entry"} />
                  <Row k="Est. TSS" v={file ? "from file" : estimatedTss} mono={!file} />
                </div>
              </div>
            )}
            <DialogFooter>
              {step > 1 && (
                <Button variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={saving}>
                  Back
                </Button>
              )}
              {step < 3 ? (
                <Button
                  onClick={() => setStep((s) => s + 1)}
                  disabled={(step === 1 && !step1Valid) || (step === 2 && !step2Valid)}
                >
                  Continue
                </Button>
              ) : (
                <Button onClick={handleConfirm} disabled={saving}>
                  {saving ? "Saving…" : "Confirm & save"}
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({ k, v, mono }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 text-sm">
      <span className="text-muted-foreground">{k}</span>
      <span className={mono ? "tabular-nums font-medium" : "font-medium"}>{v}</span>
    </div>
  );
}