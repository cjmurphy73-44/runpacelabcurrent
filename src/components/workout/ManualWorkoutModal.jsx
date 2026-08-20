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

// Lightweight quick-entry so a brand-new beta tester with no connected device can
// log a workout and immediately see the CTL/ATL/TSB engine respond.
const SPORTS = [
  { value: "running", label: "Run" },
  { value: "cycling", label: "Bike" },
  { value: "swimming", label: "Swim" },
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function ManualWorkoutModal({ open, onClose, athleteId, onSaved }) {
  const { toast } = useToast();
  const [date, setDate] = useState(todayISO());
  const [sport, setSport] = useState("running");
  const [duration, setDuration] = useState(30);
  const [distance, setDistance] = useState("");
  const [rpe, setRpe] = useState(5);
  const [saving, setSaving] = useState(false);

  const dur = Math.max(0, Number(duration) || 0);
  const estimatedTss = Math.round(dur * Number(rpe) * 0.6);

  const reset = () => {
    setDate(todayISO());
    setSport("running");
    setDuration(30);
    setDistance("");
    setRpe(5);
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (dur <= 0) {
      toast({ title: "Enter a duration", description: "Duration must be greater than 0.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
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
      if (distance) payload.distance_km = Number(distance);
      await base44.entities.WorkoutSession.create(payload);

      // Recompute the EWMA model and persist CTL/ATL/TSB so the dashboard updates instantly.
      try {
        await base44.functions.invoke("recalculateCTLATLTSB", { athlete_id: athleteId });
      } catch (recalcErr) {
        // Non-fatal: the local banner recomputes from workouts regardless.
        console.warn("recalculateCTLATLTSB failed", recalcErr);
      }

      toast({
        title: "Workout saved",
        description: `Logged ${dur} min · est. TSS ${estimatedTss}. Fitness refreshed.`,
      });
      onSaved?.();
      reset();
      onClose?.();
    } catch (err) {
      toast({ title: "Could not save workout", description: err?.message || "Unexpected error", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add a manual workout</DialogTitle>
          <DialogDescription>
            Quick-test the engine — no device required. CTL/ATL/TSB refresh as soon as you save.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="mw-date">Date</Label>
              <Input id="mw-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
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
            <div className="space-y-1.5">
              <Label htmlFor="mw-dur">Duration (min)</Label>
              <Input
                id="mw-dur"
                type="number"
                min={1}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mw-dist">Distance (km)</Label>
              <Input
                id="mw-dist"
                type="number"
                min={0}
                step="0.01"
                placeholder="optional"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="mw-rpe">Perceived effort (RPE 1–10): {rpe}</Label>
              <input
                id="mw-rpe"
                type="range"
                min={1}
                max={10}
                value={rpe}
                onChange={(e) => setRpe(Number(e.target.value))}
                className="w-full accent-[hsl(var(--primary))]"
              />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-sm">
            <span className="text-muted-foreground">Estimated TSS</span>
            <span className="font-mono font-bold">{estimatedTss}</span>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save workout"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}