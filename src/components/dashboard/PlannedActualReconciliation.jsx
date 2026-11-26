import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePlannedActualReconciliation } from "@/hooks/usePlannedActualReconciliation";
import { useToast } from "@/components/ui/use-toast";

const STATUS_LABELS = {
  EXACT: "On plan",
  COMPLETED_EXCEEDED: "Over planned duration",
  COMPLETED_SHORT: "Under planned duration",
  PLAUSIBLE: "Check this match",
};

export default function PlannedActualReconciliation({ athleteId, activePlanId, onScheduleChanged }) {
  const { matches, overdue, todaySessions, loading, error, pending, linkedWorkoutId, lastAdjustment, update } =
    usePlannedActualReconciliation(athleteId, activePlanId, onScheduleChanged);
  const { toast } = useToast();
  useEffect(() => {
    if (lastAdjustment) toast({ title: "Coach adjustment", description: lastAdjustment });
  }, [lastAdjustment, toast]);

  if (!activePlanId) return <p className="py-3 text-sm text-muted-foreground">Create an active plan to match workouts.</p>;
  return (
    <div className="space-y-3 pt-3">
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {linkedWorkoutId && <p role="status" className="text-sm">
        Workout matched to your plan. <Link to={`/workouts/${linkedWorkoutId}`} className="text-primary hover:underline">Review workout</Link>
      </p>}
      {loading ? (
        <p role="status" className="text-sm text-muted-foreground">Checking workouts against your plan…</p>
      ) : (
        <>
          {matches.length > 0 && <Card>
            <CardContent className="space-y-2 pt-4">
              <p className="text-sm font-medium">Confirm which workout you did</p>
              <ul className="divide-y divide-border">
                {matches.map(match => (
                  <li key={match.sessionId + ":" + match.scheduledWorkoutId} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                    <div>
                      <p className="capitalize">{match.scheduled.sport} · {match.scheduled.date}</p>
                      <p className="text-muted-foreground">{match.scheduled.targetDurationMinutes} min planned · {Math.round(match.recordedMinutes)} min recorded</p>
                      <Badge variant="outline" className="mr-2">{STATUS_LABELS[match.matchStatus]}</Badge>
                      <Link className="text-xs text-primary hover:underline" to={`/workouts/${match.sessionId}`}>View workout</Link>
                    </div>
                    <Button size="sm" variant="outline" disabled={Boolean(pending)}
                      onClick={() => update("link", match.scheduledWorkoutId, match.sessionId)}>
                      {pending?.action === "link" && pending.sessionId === match.scheduledWorkoutId && pending.workoutId === match.sessionId
                        ? "Linking…" : "Confirm match"}
                    </Button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>}
          {[...todaySessions, ...overdue].length > 0 && <Card>
            <CardContent className="space-y-2 pt-4">
              <p className="text-sm font-medium">Unlogged plan sessions</p>
              <ul className="divide-y divide-border">
                {[...todaySessions, ...overdue].map(session => (
                  <li key={session.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                    <div>
                      <p className="capitalize">{session.sport} · {session.date}</p>
                      <p className="text-muted-foreground">{session.prescribed_duration_minutes} min planned</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {todaySessions.some(today => today.id === session.id) && (
                        <Button size="sm" variant="outline" disabled={Boolean(pending)} onClick={() => update("complete", session.id)}>Mark complete</Button>
                      )}
                      <Button size="sm" variant="ghost" disabled={Boolean(pending)} onClick={() => update("skip", session.id)}>Skip session</Button>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>}
          {!matches.length && !todaySessions.length && !overdue.length && !error && (
            <p className="text-sm text-muted-foreground">There are no workouts to match.</p>
          )}
        </>
      )}
    </div>
  );
}
