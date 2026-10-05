import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";

export default function TrainingPlanGenerator({ athleteId, onGenerated }) {
  const [raceGoals, setRaceGoals] = useState([{ name: "", date: "", distance: "", target_time: "" }]);
  const [longTermGoal, setLongTermGoal] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const updateGoal = (idx, field, value) => {
    setRaceGoals((prev) => prev.map((g, i) => (i === idx ? { ...g, [field]: value } : g)));
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const cleanGoals = raceGoals.filter((g) => g.name && g.date);
      const res = await base44.functions.invoke("generateTrainingPlan", {
        athlete_id: athleteId,
        race_goals: cleanGoals,
        long_term_goal: longTermGoal,
      });
      if (res.data?.training_plan) {
        onGenerated(res.data.training_plan);
      } else {
        setError(res.error || "Plan generation failed. Please try again.");
      }
    } catch (e) {
      setError(e?.message || "Plan generation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-lg font-heading">Generate Your Training Plan</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">Add your upcoming race goals and we'll build a physiologically-grounded, week-by-week plan anchored to them.</p>
        {raceGoals.map((goal, idx) => (
          <div key={idx} className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-end border-b border-border pb-3">
            <div className="sm:col-span-2">
              <Label className="text-xs">Race name</Label>
              <Input value={goal.name} onChange={(e) => updateGoal(idx, "name", e.target.value)} placeholder="Sunny Coast 10K" />
            </div>
            <div>
              <Label className="text-xs">Date</Label>
              <Input type="date" value={goal.date} onChange={(e) => updateGoal(idx, "date", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Distance</Label>
              <Input value={goal.distance} onChange={(e) => updateGoal(idx, "distance", e.target.value)} placeholder="10K" />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <Label className="text-xs">Target time</Label>
                <Input value={goal.target_time} onChange={(e) => updateGoal(idx, "target_time", e.target.value)} placeholder="42:00" />
              </div>
              {raceGoals.length > 1 && (
                <Button variant="ghost" size="icon" onClick={() => setRaceGoals((prev) => prev.filter((_, i) => i !== idx))}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => setRaceGoals((prev) => [...prev, { name: "", date: "", distance: "", target_time: "" }])}>
          <Plus className="w-4 h-4 mr-1" /> Add another race
        </Button>
        <div>
          <Label className="text-xs">Long-term goal (optional)</Label>
          <Input value={longTermGoal} onChange={(e) => setLongTermGoal(e.target.value)} placeholder="Sub-17:00 5K by early 2027" />
        </div>
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        <Button onClick={handleGenerate} disabled={loading} className="w-full">
          {loading ? "Building your plan..." : "Generate Training Plan"}
        </Button>
      </CardContent>
    </Card>
  );
}