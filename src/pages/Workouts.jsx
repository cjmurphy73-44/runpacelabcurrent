import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAthlete } from "@/hooks/useAthlete";
import PageShell from "@/components/layout/PageShell";
import SectionHeading from "@/components/layout/SectionHeading";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import WorkoutDetailModal from "@/components/workout/WorkoutDetailModal";
import WorkoutLogWizard from "@/components/workout/WorkoutLogWizard";
import { Loader2, Plus, Activity, ArrowRight, Upload } from "lucide-react";

const SPORTS = [
  { value: "all", label: "All sports" },
  { value: "running", label: "Running" },
  { value: "cycling", label: "Cycling" },
  { value: "swimming", label: "Swimming" },
  { value: "strength", label: "Strength" },
  { value: "triathlon", label: "Triathlon" },
  { value: "other", label: "Other" },
];

export default function Workouts() {
  const { athlete, loading, error } = useAthlete();
  const [workouts, setWorkouts] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [sport, setSport] = useState("all");
  const [manualOpen, setManualOpen] = useState(false);

  const loadWorkouts = useCallback(async (athleteId) => {
    setFetching(true);
    setFetchError(false);
    try {
      const rows = await base44.entities.WorkoutSession.filter(
        { athlete_id: athleteId },
        "-date",
        200
      );
      setWorkouts(rows || []);
    } catch (err) {
      console.error("Workouts history load failed:", err);
      setFetchError(true);
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (athlete?.id) loadWorkouts(athlete.id);
    else if (!loading && !error) setFetching(false);
  }, [athlete?.id, loading, error, loadWorkouts]);

  const filtered = useMemo(
    () => (sport === "all" ? workouts : workouts.filter((w) => w.sport === sport)),
    [workouts, sport]
  );

  if (loading) {
    return (
      <PageShell maxWidth="max-w-4xl">
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
        </div>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell maxWidth="max-w-2xl">
        <div className="py-8 max-w-md mx-auto">
          <Card className="border-dashed text-center">
            <CardContent className="pt-8 pb-8 space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-accent flex items-center justify-center">
                <Activity className="w-6 h-6 text-accent-foreground" />
              </div>
              <h2 className="text-lg font-heading font-semibold">Couldn't reach your profile</h2>
              <p className="text-sm text-muted-foreground">
                We hit a snag loading your data. This is usually momentary — try again.
              </p>
              <div className="flex items-center justify-center gap-2">
                <Button onClick={() => window.location.reload()}>Retry</Button>
                <Button asChild variant="outline">
                  <Link to="/settings">Profile settings</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageShell>
    );
  }

  if (!athlete) {
    return (
      <PageShell title="Workouts" description="Your full session history">
        <div className="max-w-2xl mx-auto py-16 text-center text-muted-foreground">
          Create your athlete profile from the dashboard to start logging workouts.
          <div className="mt-4">
            <Button asChild>
              <Link to="/app">Go to dashboard</Link>
            </Button>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Workouts"
      description="Your full session history"
      maxWidth="max-w-4xl"
    >
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Select value={sport} onValueChange={setSport}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SPORTS.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "session" : "sessions"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setManualOpen(true)} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Manual
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link to="/import"><Upload className="w-3.5 h-3.5" /> Import</Link>
          </Button>
        </div>
      </div>

      {fetchError ? (
        <Card className="border-dashed">
          <CardContent className="pt-8 pb-8 text-center space-y-3">
            <p className="text-sm text-muted-foreground">Couldn't load your workout history. This is usually momentary.</p>
            <Button onClick={() => loadWorkouts(athlete.id)}>Retry</Button>
          </CardContent>
        </Card>
      ) : fetching ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading history…
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="pt-10 pb-10 text-center space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-accent flex items-center justify-center">
              <Activity className="w-6 h-6 text-accent-foreground" />
            </div>
            <h3 className="text-base font-heading font-semibold">No workouts yet</h3>
            <p className="text-sm text-muted-foreground">
              Log a session manually or import a file to start building your history.
            </p>
            <div className="flex items-center justify-center gap-2 pt-1">
              <Button onClick={() => setManualOpen(true)} className="gap-1.5">
                <Plus className="w-4 h-4" /> Log a workout
              </Button>
              <Button asChild variant="outline" className="gap-1.5">
                <Link to="/import">Import a file <ArrowRight className="w-4 h-4" /></Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            {filtered.map((w) => (
              <WorkoutDetailModal
                key={w.id}
                workout={w}
                athlete={athlete}
                onChanged={() => loadWorkouts(athlete.id)}
              >
                <div className="flex items-center justify-between border-b border-border last:border-0 px-4 py-3 cursor-pointer hover:bg-accent/50 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {w.date} · <Badge variant="secondary" className="capitalize">{w.sport}</Badge>
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {w.duration_minutes ? `${w.duration_minutes} min` : ""}
                      {w.distance_km ? ` · ${w.distance_km} km` : ""}
                      {w.avg_hr ? ` · ${w.avg_hr} bpm avg` : ""}
                    </p>
                  </div>
                  <p className="text-sm font-heading font-semibold shrink-0 ml-3">
                    {Math.round(w.session_trimp || w.session_tss || 0)} TRIMP
                  </p>
                </div>
              </WorkoutDetailModal>
            ))}
          </CardContent>
        </Card>
      )}

      <WorkoutLogWizard
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        athleteId={athlete.id}
        onSaved={() => { loadWorkouts(athlete.id); }}
      />
    </PageShell>
  );
}