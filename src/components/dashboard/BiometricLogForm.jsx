import React, { useState } from "react";
import { saveDailyRecovery } from "@/lib/saveDailyRecovery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFitness } from "@/context/FitnessContext";
import moment from "moment";

export default function BiometricLogForm({ athleteId }) {
  const { dailyMetrics, reload } = useFitness();
  const today = moment().format("YYYY-MM-DD");
  const existing = dailyMetrics.find((b) => b.date === today);

  const [form, setForm] = useState({
    hrv: existing?.hrv ?? "",
    sleep_score: existing?.sleep_score ?? "",
    resting_hr: existing?.resting_hr ?? "",
    readiness_score: existing?.provider_readiness_source === "manual" ? existing.provider_readiness_score ?? "" : "",
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    const payload = {};
    if (form.hrv !== "") payload.hrv = Number(form.hrv);
    if (form.sleep_score !== "") payload.sleep_score = Number(form.sleep_score);
    if (form.resting_hr !== "") payload.resting_hr = Number(form.resting_hr);
    if (form.readiness_score !== "") payload.readiness_score = Number(form.readiness_score);
    try {
      await saveDailyRecovery(athleteId, [{ date: today, ...payload }]);
      await reload();
    } catch (error) {
      setSaveError(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Today's recovery log</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">HRV (ms)</Label>
          <Input type="number" value={form.hrv} onChange={(e) => setForm({ ...form, hrv: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Sleep Score</Label>
          <Input type="number" value={form.sleep_score} onChange={(e) => setForm({ ...form, sleep_score: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Resting HR</Label>
          <Input type="number" value={form.resting_hr} onChange={(e) => setForm({ ...form, resting_hr: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Reported readiness</Label>
          <Input type="number" value={form.readiness_score} onChange={(e) => setForm({ ...form, readiness_score: e.target.value })} />
        </div>
      </div>
      {saveError && <p role="alert" className="text-sm text-destructive">{saveError}</p>}
      <Button size="sm" onClick={handleSave} disabled={saving} className="w-full">
        {saving ? "Saving..." : existing ? "Update Today's Log" : "Save Today's Log"}
      </Button>
    </div>
  );
}
