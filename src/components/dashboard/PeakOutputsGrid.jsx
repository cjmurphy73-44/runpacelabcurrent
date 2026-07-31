import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap } from "lucide-react";
import moment from "moment";
import { PEAK_DURATIONS, formatPace } from "@/lib/personalBests";

export default function PeakOutputsGrid({ power, pace }) {
  const hasPower = PEAK_DURATIONS.some((b) => power[b.key]);
  const hasPace = PEAK_DURATIONS.some((b) => pace[b.key]);

  if (!hasPower && !hasPace) {
    return (
      <p className="text-sm text-muted-foreground">
        No detailed telemetry streams stored yet — peak power/pace blocks populate once shorter workouts with second-by-second data are uploaded.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {hasPower && (
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2 font-heading">Peak Power</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {PEAK_DURATIONS.map((b) => (
              <Card key={b.key} className="border-border shadow-sm">
                <CardHeader className="pb-1 flex flex-row items-center gap-2">
                  <Zap className="w-4 h-4 text-zone-4" />
                  <CardTitle className="text-xs text-muted-foreground">{b.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xl font-heading font-bold">{power[b.key] ? `${power[b.key].value} W` : "—"}</p>
                  {power[b.key] && (
                    <p className="text-xs text-muted-foreground mt-0.5">{moment(power[b.key].session.date).format("MMM D, YYYY")}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
      {hasPace && (
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2 font-heading">Peak Running Pace</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {PEAK_DURATIONS.map((b) => (
              <Card key={b.key} className="border-border shadow-sm">
                <CardHeader className="pb-1 flex flex-row items-center gap-2">
                  <Zap className="w-4 h-4 text-zone-2" />
                  <CardTitle className="text-xs text-muted-foreground">{b.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xl font-heading font-bold">{pace[b.key] ? formatPace(pace[b.key].value) : "—"}</p>
                  {pace[b.key] && (
                    <p className="text-xs text-muted-foreground mt-0.5">{moment(pace[b.key].session.date).format("MMM D, YYYY")}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}