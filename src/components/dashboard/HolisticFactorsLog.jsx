import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useFitness } from "@/context/FitnessContext";
import moment from "moment";

export default function HolisticFactorsLog({ athleteId }) {
  const { dailyMetrics, reload } = useFitness();
  const today = moment().format("YYYY-MM-DD");
  const existing = dailyMetrics.find((m) => m.date === today);

  const [nutritionStatus, setNutritionStatus] = useState(existing?.holistic_factors?.nutrition_status || "");
  const [muscleSoreness, setMuscleSoreness] = useState(existing?.holistic_factors?.muscle_soreness || "");
  const [travelJetLag, setTravelJetLag] = useState(existing?.holistic_factors?.travel_jet_lag || false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const holistic_factors = { nutrition_status: nutritionStatus || undefined, muscle_soreness: muscleSoreness || undefined, travel_jet_lag: travelJetLag };
    if (existing) {
      await base44.entities.DailyMetrics.update(existing.id, { holistic_factors });
    } else {
      await base44.entities.DailyMetrics.create({ athlete_id: athleteId, date: today, holistic_factors });
    }
    await reload();
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm font-heading">Holistic Factors Log</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Nutrition Status</p>
          <Select value={nutritionStatus} onValueChange={setNutritionStatus}>
            <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="under_fueled">Under-fueled</SelectItem>
              <SelectItem value="fueled">Fueled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Muscle Soreness</p>
          <Select value={muscleSoreness} onValueChange={setMuscleSoreness}>
            <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox checked={travelJetLag} onCheckedChange={setTravelJetLag} id="travel_jet_lag" />
          <label htmlFor="travel_jet_lag" className="text-sm">Travel / Jet Lag</label>
        </div>
        <Button size="sm" onClick={handleSave} disabled={saving} className="w-full">{saving ? "Saving..." : "Save Today's Factors"}</Button>
      </CardContent>
    </Card>
  );
}