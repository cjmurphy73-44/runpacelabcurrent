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
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

const SPORTS = [
  { value: "running", label: "Run" },
  { value: "cycling", label: "Bike" },
  { value: "swimming", label: "Swim" },
  { value: "strength", label: "Strength" },
  { value: "triathlon", label: "Multisport" },
  { value: "other", label: "Other" },
];

export default function EditWorkoutModal({ workout, open, onClose, onSaved }) {
  const { toast } = useToast();
  const [date, setDate] = useState(workout.date);
  const [sport, setSport] = useState(workout.sport || "running");
  const [duration, setDuration] = useState(workout.duration_minutes || "");
  const [distance, setDistance] = useState(workout.distance_km ?? "");
  const [avgHr, setAvgHr] = useState(workout.avg_hr ?? "");
  const [maxHr, setMaxHr] = useState(workout.max_hr ?? "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    setSaving(true);
    try {
      const updates = { date, sport };
      if (duration !== "") updates.duration_minutes = Number(duration);
      if (distance !== "") updates.distance_km = Number(distance);
      if (avgHr !== "") updates.avg_hr = Number(avgHr);
      if (maxHr !== "") updates.max_hr = Number(maxHr);
      if (updates.duration_minutes != null) updates.duration_seconds = updates.duration_minutes * 60;

      await base44.functions.invoke("editWorkoutSession", {
        workout_id: workout.id,
        action: "update",
        updates,
      });
      toast({ title: "Workout updated", description: "Training load refreshed." });
      onSaved?.();
      onClose?.();
    } catch (err) {
      toast({
        title: "Could not update workout",
        description: err?.response?.data?.error || err?.message || "Unexpected error",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit workout</DialogTitle>
          <DialogDescription>
            Correct the date or details. Moving the date re-runs the fitness model so your CTL/ATL/TSB stay accurate.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="ew-date">Date</Label>
              <Input id="ew-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Sport</Label>
              <Select value={sport} onValueChange={setSport}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SPORTS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ew-dur">Duration (min)</Label>
              <Input id="ew-dur" type="number" min={0} value={duration} onChange={(e) => setDuration(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ew-dist">Distance (km)</Label>
              <Input id="ew-dist" type="number" min={0} step="0.01" value={distance} onChange={(e) => setDistance(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ew-avg">Avg HR</Label>
              <Input id="ew-avg" type="number" min={0} placeholder="bpm" value={avgHr} onChange={(e) => setAvgHr(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ew-max">Max HR</Label>
              <Input id="ew-max" type="number" min={0} placeholder="bpm" value={maxHr} onChange={(e) => setMaxHr(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}