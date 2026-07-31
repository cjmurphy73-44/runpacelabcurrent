import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ZoneBadge from "@/components/ui/ZoneBadge";
import moment from "moment";

const HORIZON_DAYS = 5;

export default function HorizonStrip({ athleteId }) {
  const [sessions, setSessions] = useState(null);

  useEffect(() => {
    (async () => {
      const all = await base44.entities.TrainingPlanSession.filter({ athlete_id: athleteId });
      const today = moment().startOf("day");
      const horizonEnd = moment().add(HORIZON_DAYS - 1, "days").endOf("day");
      setSessions(all.filter((s) => moment(s.date).isBetween(today, horizonEnd, null, "[]")));
    })();
  }, [athleteId]);

  const days = Array.from({ length: HORIZON_DAYS }, (_, i) => moment().add(i, "days").format("YYYY-MM-DD"));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground font-heading uppercase tracking-wide">Next {HORIZON_DAYS} Days</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {days.map((day) => {
            const session = sessions?.find((s) => s.date === day);
            const isToday = day === moment().format("YYYY-MM-DD");
            return (
              <div
                key={day}
                className={`rounded-lg border p-3 text-sm transition-colors ${isToday ? "border-primary/40 bg-primary/[0.04] shadow-sm" : "border-border bg-card"}`}
              >
                <p className="text-xs text-muted-foreground">{moment(day).format("ddd, MMM D")}</p>
                {sessions === null ? (
                  <div className="h-4 mt-2 w-2/3 bg-muted rounded animate-pulse" />
                ) : session ? (
                  <div className="mt-1 space-y-1">
                    <p className="font-medium capitalize">{session.sport}</p>
                    <div className="flex items-center gap-1 flex-wrap">
                      <ZoneBadge zone={session.prescribed_intensity_zone} />
                      <span className="text-xs text-muted-foreground">{session.prescribed_duration_minutes} min</span>
                    </div>
                  </div>
                ) : (
                  <p className="mt-1 text-muted-foreground">Rest</p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}