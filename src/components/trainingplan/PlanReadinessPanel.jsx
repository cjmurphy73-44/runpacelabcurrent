import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HeartPulse, Loader2 } from "lucide-react";

// Collects the physiology values that actually change a generated plan's targets, inline
// inside the Plan tab — no trip to Settings. Everything here is optional: a plan can still
// be built without them, its pace/HR targets just stay generic.
export function missingPlanInputs(athlete) {
  if (!athlete) return [];
  const out = [];
  if (!athlete.max_heart_rate) out.push("max heart rate");
  if (!athlete.resting_hr) out.push("resting heart rate");
  if (!athlete.vdot_estimate && !athlete.functional_threshold_pace_ms) out.push("a running benchmark");
  return out;
}

const EMPTY = { max_heart_rate: "", resting_hr: "", vdot_estimate: "", threshold_min: "", threshold_sec: "" };

export default function PlanReadinessPanel({ athlete, onSaved }) {
  const missing = useMemo(() => missingPlanInputs(athlete), [athlete]);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const [error, setError] = useState(null);

  if (!athlete || missing.length === 0 || skipped) return null;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const hasInput = Object.values(form).some((v) => v !== "");

  const handleSave = async () => {
    const updates = {};
    if (form.max_heart_rate) updates.max_heart_rate = Number(form.max_heart_rate);
    if (form.resting_hr) updates.resting_hr = Number(form.resting_hr);
    if (form.vdot_estimate) updates.vdot_estimate = Number(form.vdot_estimate);
    const min = Number(form.threshold_min || 0);
    const sec = Number(form.threshold_sec || 0);
    const totalSec = min * 60 + sec;
    if (totalSec > 0) updates.functional_threshold_pace_ms = 1000 / totalSec;
    if (Object.keys(updates).length === 0) return;

    setSaving(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("updateAthleteProfile", { athlete_id: athlete.id, updates });
      onSaved?.(res.data?.athlete || { ...athlete, ...updates });
    } catch (err) {
      setError(err?.response?.data?.error || "Couldn't save those values. Please try again.");
    }
    setSaving(false);
  };

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="pt-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <HeartPulse className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">Add a few numbers for sharper targets</p>
            <p className="text-xs text-muted-foreground">
              We're missing {missing.join(", ")}. Without them your plan still works, but pace and
              heart-rate targets stay general rather than personal. Fill in whatever you know.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Max heart rate (bpm)</Label>
            <Input type="number" min="0" value={form.max_heart_rate} onChange={set("max_heart_rate")} placeholder="e.g. 188" />
          </div>
          <div>
            <Label className="text-xs">Resting heart rate (bpm)</Label>
            <Input type="number" min="0" value={form.resting_hr} onChange={set("resting_hr")} placeholder="e.g. 52" />
            <p className="text-[11px] text-muted-foreground mt-1">Your watch usually shows this — take it first thing in the morning.</p>
          </div>
          <div>
            <Label className="text-xs">VDOT estimate (optional)</Label>
            <Input type="number" step="0.1" min="0" value={form.vdot_estimate} onChange={set("vdot_estimate")} placeholder="e.g. 48" />
          </div>
          <div>
            <Label className="text-xs">Threshold pace (min/km)</Label>
            <div className="flex items-center gap-2">
              <Input type="number" min="0" value={form.threshold_min} onChange={set("threshold_min")} placeholder="4" className="w-20" />
              <span className="text-muted-foreground">:</span>
              <Input type="number" min="0" max="59" value={form.threshold_sec} onChange={set("threshold_sec")} placeholder="30" className="w-20" />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">The pace you could hold for about an hour. Either this or VDOT is enough.</p>
          </div>
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <div className="flex flex-col sm:flex-row gap-2">
          <Button size="sm" onClick={handleSave} disabled={saving || !hasInput}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Save &amp; continue
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSkipped(true)}>
            Build without these
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}