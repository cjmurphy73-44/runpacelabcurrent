import React, { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, RefreshCw, UserPlus } from "lucide-react";
import PageShell from "@/components/layout/PageShell";
import RosterCard from "@/components/coach/RosterCard";
import AddAthleteDialog from "@/components/coach/AddAthleteDialog";
import ComparisonTable from "@/components/coach/ComparisonTable";
import { Link } from "react-router-dom";
import { useCoachAccess } from "@/hooks/useCoachAccess";
import FeatureGate from "@/components/billing/FeatureGate";

export default function CoachWorkspace() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { coachMode, canUseCoachWorkspace, plan } = useCoachAccess();
  const [assignments, setAssignments] = useState([]);
  const [profiles, setProfiles] = useState({}); // athlete_profile_id -> AthleteProfile
  const [workouts, setWorkouts] = useState({}); // athlete_profile_id -> WorkoutSession[]
  const [plans, setPlans] = useState({}); // athlete_profile_id -> TrainingPlan
  const [allProfiles, setAllProfiles] = useState([]); // for the add dialog
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [compareIds, setCompareIds] = useState(new Set());

  const loadRoster = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const filter = user.role === "admin" ? { status: "active" } : { coach_user_id: user.id, status: "active" };
      const list = await base44.entities.CoachAthleteAssignment.filter(filter, "-created_date", 200);
      setAssignments(list);
      const ids = list.map((a) => a.athlete_profile_id);
      const [pMap, wMap, plMap] = [{}, {}, {}];
      await Promise.all(ids.map(async (id) => {
        try {
          const [p, ws, pl] = await Promise.all([
            base44.entities.AthleteProfile.get(id),
            base44.entities.WorkoutSession.filter({ athlete_id: id }, "-date", 10),
            base44.entities.TrainingPlan.filter({ athlete_id: id, status: "active" }, "-start_date", 1),
          ]);
          pMap[id] = p;
          wMap[id] = ws;
          plMap[id] = pl[0];
        } catch (e) { /* missing profile */ }
      }));
      setProfiles(pMap);
      setWorkouts(wMap);
      setPlans(plMap);
    } catch (e) {
      toast({ title: "Failed to load roster", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadRoster(); }, [loadRoster]);

  const openPicker = async () => {
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
      await base44.entities.CoachAthleteAssignment.create({
        coach_user_id: user.id,
        athlete_profile_id: profile.id,
        athlete_name_snapshot: `${profile.first_name} ${profile.last_name}`,
        status: "active",
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
      await base44.entities.CoachAthleteAssignment.update(assignment.id, { status: "archived" });
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

  if (!coachMode) {
    return (
      <PageShell title="Coach Workspace" description="Multi-athlete roster, comparison, and assignment tools.">
        <Card><CardContent className="py-12 text-center space-y-3 text-muted-foreground">
          <Users className="w-10 h-10 text-muted-foreground/40 mx-auto" />
          <p className="font-medium text-foreground">Coach mode is off</p>
          <p>Enable Coach mode in Settings to manage an athlete roster.</p>
          <Button asChild variant="outline" size="sm"><Link to="/settings">Open Settings</Link></Button>
        </CardContent></Card>
      </PageShell>
    );
  }
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
          <Button size="sm" onClick={openPicker}><UserPlus className="w-4 h-4" />Add athlete</Button>
        </div>
      }
    >
      {loading && assignments.length === 0 ? (
        <div className="flex items-center justify-center py-24"><RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : assignments.length === 0 ? (
        <Card><CardContent className="py-16 text-center">
          <Users className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="font-medium">Your roster is empty</p>
          <p className="text-sm text-muted-foreground mb-4">Add athletes to track their fitness, compare signatures, and monitor plan progress.</p>
          <Button size="sm" onClick={openPicker}><UserPlus className="w-4 h-4" />Add your first athlete</Button>
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
          <Card>
            <CardHeader><CardTitle className="text-sm">Plan assignment</CardTitle><CardDescription className="text-xs">Athletes without an active plan are flagged for review.</CardDescription></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border">
                    <th className="text-left font-medium text-muted-foreground px-4 py-2">Athlete</th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-2">Plan</th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-2">Status</th>
                  </tr></thead>
                  <tbody>
                    {assignments.map((a) => {
                      const pl = plans[a.athlete_profile_id];
                      return (
                        <tr key={a.id} className="border-b border-border last:border-0">
                          <td className="px-4 py-2 font-medium">{a.athlete_name_snapshot}</td>
                          <td className="px-4 py-2 text-muted-foreground">{pl?.plan_title ?? "—"}</td>
                          <td className="px-4 py-2">
                            {pl
                              ? <span className="text-emerald-600 text-xs font-medium capitalize">{pl.status}</span>
                              : <span className="text-amber-600 text-xs font-medium">Needs a plan</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
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