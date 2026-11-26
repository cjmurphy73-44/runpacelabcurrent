import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pencil, Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import EditWorkoutModal from "@/components/workout/EditWorkoutModal";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export default function WorkoutSessionActions({ workout, onSaved }) {
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function deleteWorkout() {
    setDeleting(true);
    setError("");
    try {
      const { data } = await base44.functions.invoke("editWorkoutSession", { workout_id: workout.id, action: "delete" });
      if (!data?.deleted) throw new Error("The workout deletion could not be confirmed.");
      navigate("/workouts", { replace: true });
    } catch (error) {
      setError(error?.response?.data?.error || error.message || "Could not delete the workout.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" /> Edit workout</Button>
      <Button variant="ghost" size="sm" onClick={() => { setError(""); setConfirming(true); }}>
        <Trash2 className="h-4 w-4" /> Delete workout
      </Button>
      {editing && <EditWorkoutModal workout={workout} open onClose={() => setEditing(false)} onSaved={onSaved} />}
      <AlertDialog open={confirming} onOpenChange={(open) => { if (!deleting) setConfirming(open); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this workout?</AlertDialogTitle>
            <AlertDialogDescription>This permanently removes the workout, its original file and its feedback.</AlertDialogDescription>
          </AlertDialogHeader>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <Button variant="destructive" onClick={deleteWorkout} disabled={deleting}>{deleting ? "Deleting…" : "Delete workout"}</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
