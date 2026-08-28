import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SectionHeading from "@/components/layout/SectionHeading";
import { usePlannedActualReconciliation } from "@/hooks/usePlannedActualReconciliation";
import { CalendarCheck, Link2, TrendingUp, TrendingDown, Equal } from "lucide-react";

const STATUS_STYLES = {
  EXACT: { label: "On plan", chip: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  COMPLETED_EXCEEDED: { label: "Exceeded plan", chip: "bg-amber-50 text-amber-700 border-amber-200" },
  COMPLETED_SHORT: { label: "Short of plan", chip: "bg-rose-50 text-rose-700 border-rose-200" },
};

function titleCase(sport) {
  if (!sport) return "Session";
  return sport.charAt(0).toUpperCase() + sport.slice(1);
}

export default function PlannedActualReconciliation({ athleteId }) {
  const { matches, loading, error, confirmMatch, confirmingId, lastConfirmed } = usePlannedActualReconciliation(athleteId);

  return (
    <div className="space-y-4">
      <SectionHeading
        title="Planned vs. Actual"
        description="Ingested sessions fuzzy-matched to scheduled plan items (±1 day, ±20% duration). Confirm a match to mark the plan session complete and link the activity."
        icon={CalendarCheck}
      />
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
                      {confirmed ? "Linked" : isConfirming ? "Linking…" : "Confirm match"}
                    </Button>
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