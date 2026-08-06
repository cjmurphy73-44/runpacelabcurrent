import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import moment from "moment";

const TAGS = [
  { key: "high_work_stress", label: "High Work Stress" },
  { key: "travel_jet_lag", label: "Travel / Jet Lag" },
  { key: "muscle_soreness", label: "Muscle Soreness" },
];

export default function LifestyleFactorForm({ athleteId }) {
  const today = moment().format("YYYY-MM-DD");
  const [existing, setExisting] = useState(null);
  const [form, setForm] = useState({ high_work_stress: false, travel_jet_lag: false, muscle_soreness: false, nutrition_quality: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const rows = await base44.entities.DailyMetrics.filter({ athlete_id: athleteId, date: today });
      const row = rows[0] || null;
      setExisting(row);
      const hf = row?.holistic_factors || {};
      if (row) {
        setForm({
          high_work_stress: /high work stress/i.test(row.notes || ""),
          travel_jet_lag: !!hf.travel_jet_lag,
          muscle_soreness: hf.muscle_soreness === "high",
          nutrition_quality: hf.nutrition_status === "fueled" ? "good" : (hf.nutrition_status === "under_fueled" ? "poor" : ""),
        });
      }
    })();
  }, [athleteId, today]);

  const handleSave = async () => {
    setSaving(true);
    const nutritionStatus = form.nutrition_quality === "good" || form.nutrition_quality === "excellent"
      ? "fueled"
      : form.nutrition_quality
        ? "under_fueled"
        : undefined;
    const payload = {
      athlete_id: athleteId,
      date: today,
      holistic_factors: {
        travel_jet_lag: form.travel_jet_lag,
        muscle_soreness: form.muscle_soreness ? "high" : "low",
        ...(nutritionStatus ? { nutrition_status: nutritionStatus } : {}),
      },
      notes: form.high_work_stress ? "High work stress" : "",
    };
    if (existing) {
      await base44.entities.DailyMetrics.update(existing.id, payload);
    } else {
      const created = await base44.entities.DailyMetrics.create(payload);
      setExisting(created);
    }
    setSaving(false);
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Today's life stress factors</p>
      <div className="space-y-2">
        {TAGS.map((tag) => (
          <div key={tag.key} className="flex items-center gap-2">
            <Checkbox
              id={tag.key}
              checked={form[tag.key]}
              onCheckedChange={(checked) => setForm({ ...form, [tag.key]: !!checked })}
            />
            <Label htmlFor={tag.key} className="text-sm font-normal">{tag.label}</Label>
          </div>
        ))}
      </div>
      <div>
        <Label className="text-xs">Nutrition Quality</Label>
        <Select value={form.nutrition_quality} onValueChange={(v) => setForm({ ...form, nutrition_quality: v })}>
          <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="poor">Poor</SelectItem>
            <SelectItem value="fair">Fair</SelectItem>
            <SelectItem value="good">Good</SelectItem>
            <SelectItem value="excellent">Excellent</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button size="sm" onClick={handleSave} disabled={saving} className="w-full">
        {saving ? "Saving..." : existing ? "Update Today's Factors" : "Save Today's Factors"}
      </Button>
    </div>
  );
}