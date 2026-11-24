import React, { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Users, RefreshCw, UserPlus } from "lucide-react";
import PageShell from "@/components/layout/PageShell";
import RosterCard from "@/components/coach/RosterCard";
import AddAthleteDialog from "@/components/coach/AddAthleteDialog";
import ComparisonTable from "@/components/coach/ComparisonTable";
import RosterDashboard from "@/components/coach/RosterDashboard";
import { useCoachAccess } from "@/hooks/useCoachAccess";
import FeatureGate from "@/components/billing/FeatureGate";

export default function CoachWorkspace() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { canUseCoachWorkspace, plan, loading: accessLoading } = useCoachAccess();
  const [assignments, setAssignments] = useState([]);
  const [profiles, setProfiles] = useState({}); // athlete_profile_id -> AthleteProfile
  const [workouts, setWorkouts] = useState({}); // athlete_profile_id -> WorkoutSession[]
  const [plans, setPlans] = useState({}); // athlete_profile_id -> TrainingPlan
  const [allProfiles, setAllProfiles] = useState([]); // for the add dialog
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [compareIds, setCompareIds] = useState(new Set());

  const loadRoster = useCallback(async () => {
    if (!user?.id || accessLoading || !canUseCoachWorkspace) return;
    setLoading(true);
    try {
      const { data } = await base44.functions.invoke("manageCoachRoster", { action: "list" });
      setAssignments(data.assignments);
      setProfiles(data.profiles);
      setWorkouts(data.workouts);
      setPlans(data.plans);
    } catch (e) {
      toast({ title: "Failed to load roster", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [user, accessLoading, canUseCoachWorkspace, toast]);

  useEffect(() => { loadRoster(); }, [loadRoster]);

  const openPicker = async () => {
    if (user?.role !== "admin") return;
    try {
      const list = await base44.entities.AthleteProfile.list("-created_date", 200);
      setAllProfiles(list);
    } catch (e) {
      toast({ title: "Failed to load athletes", variant: "destructive" });
    }
    setPickerOpen(true);
  };

  const addAthlete = async (profile) => {
    try {
      await base44.functions.invoke("manageCoachRoster", {
        action: "assign",
        coach_user_id: user.id,
        athlete_id: profile.id,
      });
      setPickerOpen(false);
      toast({ title: `${profile.first_name} ${profile.last_name} added to roster` });
      loadRoster();
    } catch (e) {
      toast({ title: "Failed to add athlete", variant: "destructive" });
    }
  };

  const removeAthlete = async (assignment) => {
    try {
      await base44.functions.invoke("manageCoachRoster", { action: "revoke", assignment_id: assignment.id });
      setCompareIds((s) => { const n = new Set(s); n.delete(assignment.athlete_profile_id); return n; });
      toast({ title: "Removed from roster" });
      loadRoster();
    } catch (e) {
      toast({ title: "Failed to remove", variant: "destructive" });
    }
  };

  const toggleCompare = (id) => setCompareIds((s) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });

  if (!canUseCoachWorkspace) {
    return (
      <PageShell title="Coach Workspace" description="Multi-athlete roster, comparison, and assignment tools.">
        <FeatureGate feature="coach_workspace" plan={plan} />
      </PageShell>
    );
  }

  const compared = assignments.filter((a) => compareIds.has(a.athlete_profile_id)).map((a) => ({ assignment: a, profile: profiles[a.athlete_profile_id] }));

  return (
    <PageShell
      title="Coach Workspace"
      description="Manage your athlete roster, compare fitness signatures, and track plan status."
      action={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadRoster} disabled={loading}><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />Refresh</Button>
          {user?.role === "admin" && <Button size="sm" onClick={openPicker}><UserPlus className="w-4 h-4" />Add athlete</Button>}
        </div>
      }
    >
      {loading && assignments.length === 0 ? (
        <div className="flex items-center justify-center py-24"><RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : assignments.length === 0 ? (
        <Card><CardContent className="py-16 text-center">
          <Users className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="font-medium">Your roster is empty</p>
          <p className="text-sm text-muted-foreground mb-4">Athletes appear here after an administrator verifies the assignment.</p>
          {user?.role === "admin" && <Button size="sm" onClick={openPicker}><UserPlus className="w-4 h-4" />Add your first athlete</Button>}
        </CardContent></Card>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {assignments.map((a) => (
              <RosterCard
                key={a.id}
                assignment={a}
                profile={profiles[a.athlete_profile_id]}
                workouts={workouts[a.athlete_profile_id]}
                plan={plans[a.athlete_profile_id]}
                selected={compareIds.has(a.athlete_profile_id)}
                onToggleCompare={() => toggleCompare(a.athlete_profile_id)}
                onRemove={() => removeAthlete(a)}
              />
            ))}
          </div>
          <ComparisonTable athletes={compared} />
          <RosterDashboard
            assignments={assignments}
            profiles={profiles}
            workouts={workouts}
            plans={plans}
            onChanged={loadRoster}
          />
        </>
      )}
      <AddAthleteDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        profiles={allProfiles}
        existingIds={assignments.map((a) => a.athlete_profile_id)}
        onAdd={addAthlete}
      />
    </PageShell>
  );
}