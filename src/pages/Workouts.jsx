import React, { useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAthlete } from "@/hooks/useAthlete";
import PageShell from "@/components/layout/PageShell";
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
import { workoutLoadPresentation } from "@/lib/workoutLoadPresentation";
import WorkoutLogWizard from "@/components/workout/WorkoutLogWizard";
import { Loader2, Plus, Activity, ArrowRight, Upload } from "lucide-react";

const PAGE_SIZE = 50;
const SUMMARY_FIELDS = [
  "id", "date", "sport", "duration_minutes", "distance_km", "avg_hr",
  "session_trimp", "session_tss", "load_source",
];

const SPORTS = [
  { value: "all", label: "All sports" },
  { value: "running", label: "Running" },
  { value: "walking", label: "Walking" },
  { value: "cycling", label: "Cycling" },
  { value: "swimming", label: "Swimming" },
  { value: "strength", label: "Strength" },
  { value: "triathlon", label: "Triathlon" },
  { value: "other", label: "Other" },
];

export default function Workouts() {
  const { athlete, loading, error } = useAthlete();
  const [sport, setSport] = useState("all");
  const [manualOpen, setManualOpen] = useState(false);
  const history = useInfiniteQuery({
    queryKey: ["workout-history", athlete?.id, sport],
    enabled: Boolean(athlete?.id),
    initialPageParam: 0,
    retry: false,
    queryFn: async ({ pageParam }) => {
      const query = { athlete_id: athlete.id, ...(sport === "all" ? {} : { sport }) };
      return await base44.entities.WorkoutSession.filter(query, "-date", PAGE_SIZE + 1, pageParam, SUMMARY_FIELDS);
    },
    getNextPageParam: (last, _pages, offset) => last.length > PAGE_SIZE ? offset + PAGE_SIZE : undefined,
  });
  const workouts = history.data?.pages.flatMap(page => page.slice(0, PAGE_SIZE)) ?? [];

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
                We hit a snag loading your data. This is usually momentary, try again.
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
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
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
            {workouts.length} {workouts.length === 1 ? "session" : "sessions"}{history.hasNextPage ? " loaded" : ""}
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

      {history.isError && workouts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="pt-8 pb-8 text-center space-y-3">
            <p className="text-sm text-muted-foreground">Couldn't load your workout history. This is usually momentary.</p>
            <Button onClick={() => history.refetch()}>Retry</Button>
          </CardContent>
        </Card>
      ) : history.isPending ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading history…
        </div>
      ) : workouts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="pt-10 pb-10 text-center space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-accent flex items-center justify-center">
              <Activity className="w-6 h-6 text-accent-foreground" />
            </div>
            <h3 className="text-base font-heading font-semibold">{sport === "all" ? "No workouts yet" : "No workouts in this sport"}</h3>
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
            {workouts.map((workout) => {
              const load = workoutLoadPresentation(workout);
              return (
                <Link
                  key={workout.id}
                  to={`/workouts/${workout.id}`}
                  className="flex items-center justify-between gap-3 border-b border-border last:border-0 px-4 py-3 hover:bg-accent/50 focus-visible:ring-inset focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {workout.date} · <Badge variant="secondary" className="capitalize">{workout.sport}</Badge>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {workout.duration_minutes ? `${workout.duration_minutes} min` : ""}
                      {workout.distance_km ? ` · ${workout.distance_km} km` : ""}
                      {workout.avg_hr ? ` · ${workout.avg_hr} bpm avg` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-heading font-semibold">{load.amount}</p>
                    <p className="text-xs text-muted-foreground">{load.label}</p>
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>
      )}

      {history.hasNextPage && (
        <div className="mt-4 space-y-2 text-center">
          <Button variant="outline" onClick={() => history.fetchNextPage()} disabled={history.isFetchingNextPage}>
            {history.isFetchingNextPage ? "Loading…" : "Load more workouts"}
          </Button>
          {history.isFetchNextPageError && <p role="alert" className="text-sm text-destructive">More workouts could not be loaded. Try again.</p>}
        </div>
      )}
      <WorkoutLogWizard
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        athleteId={athlete.id}
        onSaved={() => history.refetch()}
      />
    </PageShell>
  );
}