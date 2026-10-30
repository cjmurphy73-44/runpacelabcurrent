import React, { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Pencil, Trash2, Thermometer, Droplets, Flame } from "lucide-react";
import WorkoutMetricTile from "@/components/workout/WorkoutMetricTile";
import WorkoutZonePanel from "@/components/workout/WorkoutZonePanel";
import WorkoutFitnessImpact from "@/components/workout/WorkoutFitnessImpact";
import WorkoutSplitsTable from "@/components/workout/WorkoutSplitsTable";
import EditWorkoutModal from "@/components/workout/EditWorkoutModal";
import { sessionCalories, normalizedPacePower } from "@/lib/workoutAnalytics";

export default function WorkoutDetailModal({ workout, athlete, children, onChanged }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const calories = useMemo(() => sessionCalories(workout, athlete), [workout, athlete]);
  const pacePower = normalizedPacePower(workout);
  const durationMin = Math.round(workout.duration_minutes || (workout.duration_seconds || 0) / 60);
  const load = workout.session_trimp || workout.session_tss || 0;

  // Plain-language physiological read of the numbers we actually have. No invented
  // "aerobic/anaerobic training effect" percentages.
  const takeaways = useMemo(() => {
    const out = [];
    if (load) {
      out.push(
        `Session load ${Math.round(load)} ${workout.session_trimp ? "TRIMP — Banister's heart-rate impulse, the stress that feeds your fitness curve" : "rTSS — pace-based stress used when no heart-rate data exists"}.`
      );
    }
    if (workout.efficiency_factor) {
      out.push(
        `Efficiency factor ${Number(workout.efficiency_factor).toFixed(2)} — ${workout.sport === "cycling" ? "watts" : "pace"} produced per heartbeat. A rising trend across similar sessions is an aerobic gain.`
      );
    }
    if (workout.aerobic_decoupling != null && Math.abs(workout.aerobic_decoupling) >= 5) {
      out.push(
        `Aerobic decoupling ${Number(workout.aerobic_decoupling).toFixed(1)}% — the second half cost more for the same output, which points to fatigue, heat or fuelling.`
      );
    }
    if (calories.source === "device") {
      out.push("Energy comes from the watch's own model, which accounts for motion and your profile. It is never replaced by a formula here.");
    }
    if (workout.zone_method === "average") {
      out.push("Zone time is estimated from average heart rate for this session — attach a .fit or .tcx export for exact second-by-second zones.");
    }
    return out;
  }, [workout, calories.source, load]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await base44.functions.invoke("editWorkoutSession", { workout_id: workout.id, action: "delete" });
      toast({ title: "Workout deleted", description: "Training load refreshed." });
      setConfirmDelete(false);
      setOpen(false);
      onChanged?.();
    } catch (err) {
      toast({
        title: "Could not delete workout",
        description: err?.response?.data?.error || err?.message || "Unexpected error",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto bg-card/95 border border-border/50 backdrop-blur">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            {workout.date}
            <Badge variant="secondary" className="capitalize">{workout.sport}</Badge>
            {workout.source_format && (
              <Badge variant="outline" className="text-[10px] uppercase font-mono">{workout.source_format}</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <WorkoutMetricTile label="Total Time" value={durationMin ? `${durationMin} min` : "—"} />
          <WorkoutMetricTile label="Distance" value={workout.distance_km ? `${workout.distance_km.toFixed(2)} km` : "—"} />
          <WorkoutMetricTile label="Load (TRIMP)" value={load ? Math.round(load) : "—"} />
          <WorkoutMetricTile label="Avg HR" value={workout.avg_hr ? `${workout.avg_hr} bpm` : "—"} />
          <WorkoutMetricTile label="Max HR" value={workout.max_hr ? `${workout.max_hr} bpm` : "—"} />
          <WorkoutMetricTile label="Norm. Pace/Power" value={pacePower} />
          <WorkoutMetricTile label="Calories" value={calories.kcal ? `${calories.kcal} kcal` : "—"} />
          <WorkoutMetricTile label="Efficiency Factor" value={workout.efficiency_factor ? Number(workout.efficiency_factor).toFixed(2) : "—"} />
        </div>

        <div className="pt-2">
          <WorkoutZonePanel workout={workout} athlete={athlete} />
        </div>

        <div className="pt-3 border-t border-border/50">
          <WorkoutFitnessImpact workout={workout} athleteId={athlete?.id} />
        </div>

        {workout.laps?.length > 0 && (
          <div className="pt-3 border-t border-border/50">
            <WorkoutSplitsTable laps={workout.laps} sport={workout.sport} />
          </div>
        )}

        <div className="pt-3 border-t border-border/50 space-y-2">
          <div className="rounded-lg border border-border/60 bg-secondary/30 p-3 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-muted-foreground">Energy</span>
              <Badge variant={calories.source === "device" ? "secondary" : "outline"} className="text-[10px]">
                {calories.source === "device" ? "Device-measured" : "Estimated"}
              </Badge>
            </div>
            <p className="font-mono text-lg font-semibold flex items-center gap-2">
              {calories.kcal ? `${calories.kcal} kcal` : "—"}
              <Flame className="w-4 h-4 text-warning" />
            </p>
            {calories.basis && <p className="text-[11px] text-muted-foreground">{calories.basis}</p>}
            {(workout.temperature_c != null || workout.humidity_pct != null) && (
              <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                {workout.temperature_c != null && (
                  <span className="inline-flex items-center gap-1"><Thermometer className="w-3 h-3" />{Math.round(workout.temperature_c)}°C</span>
                )}
                {workout.humidity_pct != null && (
                  <span className="inline-flex items-center gap-1"><Droplets className="w-3 h-3" />{Math.round(workout.humidity_pct)}% humidity</span>
                )}
              </div>
            )}
          </div>

          {takeaways.length > 0 && (
            <ul className="space-y-1.5 text-[11px] text-muted-foreground">
              {takeaways.map((t, i) => (
                <li key={i} className="flex gap-1.5">
                  <span className="text-primary mt-0.5">•</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="w-4 h-4" /> Edit
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="w-4 h-4" /> Delete
          </Button>
        </div>
      </DialogContent>

      <EditWorkoutModal
        workout={workout}
        open={editing}
        onClose={() => setEditing(false)}
        onSaved={() => { setEditing(false); setOpen(false); onChanged?.(); }}
      />
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this workout?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the session and its attached files/feedback, then re-runs the fitness model. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}