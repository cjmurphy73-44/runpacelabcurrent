import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFitness } from "@/context/FitnessContext";
import moment from "moment";

function quarterLabel(dateStr) {
  const m = moment(dateStr);
  return `Q${m.quarter()} ${m.year()}`;
}

export default function BaselineHistoryMatrix({ athleteId }) {
  const { physiologicalBaselines, reload } = useFitness();
  const [form, setForm] = useState({ recorded_date: moment().format("YYYY-MM-DD"), vo2max_ml_kg_min: "", functional_threshold_power_watts: "", lactate_threshold_hr_bpm: "", resting_hr_bpm: "" });
  const [saving, setSaving] = useState(false);

  const rows = [...physiologicalBaselines].sort((a, b) => b.recorded_date.localeCompare(a.recorded_date));

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.PhysiologicalBaselines.create({
      athlete_id: athleteId,
      recorded_date: form.recorded_date,
      vo2max_ml_kg_min: form.vo2max_ml_kg_min === "" ? undefined : Number(form.vo2max_ml_kg_min),
      functional_threshold_power_watts: form.functional_threshold_power_watts === "" ? undefined : Number(form.functional_threshold_power_watts),
      lactate_threshold_hr_bpm: form.lactate_threshold_hr_bpm === "" ? undefined : Number(form.lactate_threshold_hr_bpm),
      resting_hr_bpm: form.resting_hr_bpm === "" ? undefined : Number(form.resting_hr_bpm),
    });
    await reload();
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm font-heading">Aerobic Baseline Shifts</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No baseline tests recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border">
                  <th className="py-2 pr-3">Quarter</th>
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">VO2 Max</th>
                  <th className="py-2 pr-3">FTP (W)</th>
                  <th className="py-2 pr-3">LTHR</th>
                  <th className="py-2 pr-3">Resting HR</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="py-2 pr-3">{quarterLabel(r.recorded_date)}</td>
                    <td className="py-2 pr-3">{moment(r.recorded_date).format("MMM D, YYYY")}</td>
                    <td className="py-2 pr-3">{r.vo2max_ml_kg_min ?? "-"}</td>
                    <td className="py-2 pr-3">{r.functional_threshold_power_watts ?? "-"}</td>
                    <td className="py-2 pr-3">{r.lactate_threshold_hr_bpm ?? "-"}</td>
                    <td className="py-2 pr-3">{r.resting_hr_bpm ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 border-t border-border pt-4">
          <Input type="date" value={form.recorded_date} onChange={(e) => setForm({ ...form, recorded_date: e.target.value })} />
          <Input type="number" placeholder="VO2 Max" value={form.vo2max_ml_kg_min} onChange={(e) => setForm({ ...form, vo2max_ml_kg_min: e.target.value })} />
          <Input type="number" placeholder="FTP (W)" value={form.functional_threshold_power_watts} onChange={(e) => setForm({ ...form, functional_threshold_power_watts: e.target.value })} />
          <Input type="number" placeholder="LTHR" value={form.lactate_threshold_hr_bpm} onChange={(e) => setForm({ ...form, lactate_threshold_hr_bpm: e.target.value })} />
          <Input type="number" placeholder="Resting HR" value={form.resting_hr_bpm} onChange={(e) => setForm({ ...form, resting_hr_bpm: e.target.value })} />
        </div>
        <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Log New Baseline Test"}</Button>
      </CardContent>
    </Card>
  );
}