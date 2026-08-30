import React, { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SectionHeading from "@/components/layout/SectionHeading";
import { usePlannedActualReconciliation } from "@/hooks/usePlannedActualReconciliation";
import { useToast } from "@/components/ui/use-toast";
import { CalendarCheck, Link2, TrendingUp, TrendingDown, Equal, Check, Unlink, SkipForward, AlertTriangle, Sun } from "lucide-react";

const STATUS_STYLES = {
  EXACT: { label: "On plan", chip: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  COMPLETED_EXCEEDED: { label: "Excess", chip: "bg-amber-50 text-amber-700 border-amber-200" },
  COMPLETED_SHORT: { label: "Partial", chip: "bg-rose-50 text-rose-700 border-rose-200" },
  PLAUSIBLE: { label: "Plausible", chip: "bg-sky-50 text-sky-700 border-sky-200" },
};

function titleCase(sport) {
  if (!sport) return "Session";
  return sport.charAt(0).toUpperCase() + sport.slice(1);
}

function pctText(ratio) {
  if (ratio == null || isNaN(ratio)) return "—";
  return `${Math.round(ratio * 100)}% of plan`;
}

export default function PlannedActualReconciliation({ athleteId }) {
  const {
    matches,
    autoLinked,
    overdue,
    todaySessions,
    loading,
    error,
    confirmMatch,
    confirmAutoLink,
    rejectAutoLink,
    markSkipped,
    markCompleted,
    confirmingId,
    rejectingId,
    skippingId,
    markingId,
    lastConfirmed,
    lastRejected,
    lastSkipped,
    lastMarkedDone,
    adjustingId,
    lastAdjustment,
  } = usePlannedActualReconciliation(athleteId);
  const { toast } = useToast();

  useEffect(() => {
    if (lastAdjustment?.summary) {
      toast({ title: "Coach adjustment", description: lastAdjustment.summary });
    }
  }, [lastAdjustment, toast]);

  return (
    <div className="space-y-4">
      <SectionHeading
        title="Planned vs. Actual"
        description="Ingested sessions fuzzy-matched to scheduled plan items (±1 day, ±20% duration). Unmarked sessions older than a week are hidden. Confirm a match to mark the plan session complete / partial / excess and link the activity."
        icon={CalendarCheck}
      />

      {/* Auto-linked — verify or unlink */}
      {autoLinked.length > 0 && (
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Check className="w-4 h-4 text-emerald-600" />
              {autoLinked.length} session{autoLinked.length === 1 ? "" : "s"} auto-linked at ≥90% — verify this is what you did, or unlink.
            </div>
            <ul className="divide-y divide-border">
              {autoLinked.map((m) => {
                const confirmed = lastConfirmed === m.sessionId;
                const rejected = lastRejected === m.sessionId;
                const isRejecting = rejectingId === m.sessionId;
                const onPlan = m.matchStatus === "EXACT";
                return (
                  <li key={m.sessionId} className="py-3 flex flex-wrap items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-foreground">{titleCase(m.scheduled?.sport)}</span>
                        <Badge variant="outline" className={STATUS_STYLES.EXACT.chip}>Auto-linked · on plan</Badge>
                        <span className="text-xs text-muted-foreground font-mono tabular-nums">{pctText(m.varianceDetails.completionRatio)}</span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground font-mono tabular-nums">
                        plan {m.scheduled?.date || "—"} · target {m.scheduled?.targetDurationMinutes ?? "—"} min
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant={confirmed ? "secondary" : "outline"}
                        onClick={() => confirmAutoLink(m)}
                        disabled={confirmed}
                        className="gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        {confirmed ? "Verified" : "That's it"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => rejectAutoLink(m)}
                        disabled={isRejecting || rejected}
                        className="gap-1.5 text-muted-foreground"
                      >
                        <Unlink className="w-3.5 h-3.5" />
                        {rejected ? "Unlinked" : isRejecting ? "Unlinking…" : "That wasn't it"}
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Today's planned sessions — quick mark off */}
      {todaySessions.length > 0 && (
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Sun className="w-4 h-4 text-amber-500" />
              {todaySessions.length} session{todaySessions.length === 1 ? "" : "s"} planned for today — mark off when done.
            </div>
            <ul className="divide-y divide-border">
              {todaySessions.map((s) => {
                const done = lastMarkedDone === s.id;
                const skipped = lastSkipped === s.id;
                const isMarking = markingId === s.id;
                const isSkipping = skippingId === s.id;
                return (
                  <li key={s.id} className="py-3 flex flex-wrap items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-foreground">{titleCase(s.sport)}</span>
                        {s.intensityZone && <Badge variant="outline">{s.intensityZone}</Badge>}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground font-mono tabular-nums">
                        today · {s.prescribedDurationMinutes ?? "—"} min
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant={done ? "secondary" : "default"}
                        onClick={() => markCompleted(s.id)}
                        disabled={isMarking || done || skipped}
                        className="gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        {done ? "Done" : isMarking ? "Marking…" : "Done"}
                      </Button>
                      <Button
                        size="sm"
                        variant={skipped ? "secondary" : "outline"}
                        onClick={() => markSkipped(s.id)}
                        disabled={isSkipping || skipped || done}
                        className="gap-1.5 text-muted-foreground"
                      >
                        <SkipForward className="w-3.5 h-3.5" />
                        {skipped ? "Skipped" : isSkipping ? "…" : "Skip"}
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Overdue planned sessions — mark as skipped */}
      {overdue.length > 0 && (
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              {overdue.length} planned session{overdue.length === 1 ? "" : "s"} overdue in the past week with no matching activity. Mark as skipped if you didn't do it.
            </div>
            <ul className="divide-y divide-border">
              {overdue.map((s) => {
                const skipped = lastSkipped === s.id;
                const isSkipping = skippingId === s.id;
                return (
                  <li key={s.id} className="py-3 flex flex-wrap items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-foreground">{titleCase(s.sport)}</span>
                        {s.intensityZone && <Badge variant="outline">{s.intensityZone}</Badge>}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground font-mono tabular-nums">
                        due {s.date} · {s.prescribedDurationMinutes ?? "—"} min
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={skipped ? "secondary" : "outline"}
                      onClick={() => markSkipped(s.id)}
                      disabled={isSkipping || skipped}
                      className="gap-1.5"
                    >
                      <SkipForward className="w-3.5 h-3.5" />
                      {skipped ? "Skipped" : isSkipping ? "Skipping…" : "Mark as skipped"}
                    </Button>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <p className="text-sm text-muted-foreground">Matching your sessions to the plan…</p>
          ) : error ? (
            <p className="text-sm text-rose-600">{error}</p>
          ) : matches.length === 0 ? (
            <p className="text-sm text-muted-foreground">No unlinked ingested sessions matched a scheduled session within tolerance.</p>
          ) : (
            <ul className="divide-y divide-border">
              {matches.map((m) => {
                const st = STATUS_STYLES[m.matchStatus] || STATUS_STYLES.EXACT;
                const dv = m.varianceDetails.durationVariancePercent;
                const VIcon = dv > 5 ? TrendingUp : dv < -5 ? TrendingDown : Equal;
                const confirmed = lastConfirmed === m.sessionId;
                const isConfirming = confirmingId === m.sessionId;
                return (
                  <li key={m.sessionId} className="py-3 flex flex-wrap items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-foreground">{titleCase(m.scheduled?.sport)}</span>
                        <Badge variant="outline" className={st.chip}>{st.label}</Badge>
                        <span className="text-xs text-muted-foreground font-mono tabular-nums">confidence {(m.confidenceScore * 100).toFixed(0)}%</span>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground font-mono tabular-nums flex-wrap">
                        <span>plan {m.scheduled?.date || "—"}</span>
                        <span>· target {m.scheduled?.targetDurationMinutes ?? "—"} min</span>
                        <span className="inline-flex items-center gap-1">
                          <VIcon className="w-3.5 h-3.5" /> {dv > 0 ? "+" : ""}{dv}%
                        </span>
                        <span>· {pctText(m.varianceDetails.completionRatio)}</span>
                        {m.varianceDetails.dayOffset !== 0 && (
                          <span className="text-amber-600">day {m.varianceDetails.dayOffset > 0 ? "+" : ""}{m.varianceDetails.dayOffset}</span>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={confirmed ? "secondary" : "outline"}
                      onClick={() => confirmMatch(m)}
                      disabled={isConfirming || confirmed}
                      className="gap-1.5"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      {confirmed ? "Linked" : isConfirming ? "Linking…" : m.matchStatus === "PLAUSIBLE" ? "That was it" : "Confirm match"}
                    </Button>
                    {m.matchStatus === "PLAUSIBLE" && !confirmed && (
                      <span className="w-full text-[11px] text-sky-600">Outside ±20% — looks close enough to confirm?</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}