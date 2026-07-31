import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFitness } from "@/context/FitnessContext";
import moment from "moment";

export default function BiometricLogForm({ athleteId }) {
  const { biometricTelemetry, reload } = useFitness();
  const today = moment().format("YYYY-MM-DD");
  const existing = biometricTelemetry.find((b) => b.date === today);

  const [form, setForm] = useState({
    hrv_ms: existing?.hrv_ms ?? "",
    sleep_score: existing?.sleep_score ?? "",
    sleep_duration_hours: existing?.sleep_duration_hours ?? "",
    active_calories: existing?.active_calories ?? "",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      athlete_id: athleteId,
      date: today,
      hrv_ms: form.hrv_ms === "" ? undefined : Number(form.hrv_ms),
      sleep_score: form.sleep_score === "" ? undefined : Number(form.sleep_score),
      sleep_duration_hours: form.sleep_duration_hours === "" ? undefined : Number(form.sleep_duration_hours),
      active_calories: form.active_calories === "" ? undefined : Number(form.active_calories),
    };
    if (existing) {
      await base44.entities.BiometricTelemetry.update(existing.id, payload);
    } else {
      await base44.entities.BiometricTelemetry.create(payload);
    }
    await reload();
    setSaving(false);
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Today's recovery log</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">HRV (ms)</Label>
          <Input type="number" value={form.hrv_ms} onChange={(e) => setForm({ ...form, hrv_ms: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Sleep Score</Label>
          <Input type="number" value={form.sleep_score} onChange={(e) => setForm({ ...form, sleep_score: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Sleep (hrs)</Label>
          <Input type="number" value={form.sleep_duration_hours} onChange={(e) => setForm({ ...form, sleep_duration_hours: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Active Calories</Label>
          <Input type="number" value={form.active_calories} onChange={(e) => setForm({ ...form, active_calories: e.target.value })} />
        </div>
      </div>
      <Button size="sm" onClick={handleSave} disabled={saving} className="w-full">
        {saving ? "Saving..." : existing ? "Update Today's Log" : "Save Today's Log"}
      </Button>
    </div>
  );
}