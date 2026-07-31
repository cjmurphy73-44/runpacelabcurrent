import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy } from "lucide-react";
import moment from "moment";
import { STANDARD_DISTANCES, formatDuration } from "@/lib/personalBests";

export default function DistancePBGrid({ allTimePBs, seasonPBs }) {
  const populated = STANDARD_DISTANCES.filter((d) => allTimePBs[d.key]);
  if (populated.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No race-distance efforts recorded yet — upload runs matching standard distances (5K, 10K, Half, etc.) to populate this ledger.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {populated.map((d) => {
        const allTime = allTimePBs[d.key];
        const season = seasonPBs[d.key];
        const isSeasonBest = season && season.session.id === allTime.session.id;
        return (
          <Card key={d.key} className="border-border shadow-sm">
            <CardHeader className="pb-2 flex flex-row items-center gap-2">
              <Trophy className="w-4 h-4 text-zone-3" />
              <CardTitle className="text-sm text-muted-foreground">{d.label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-2xl font-heading font-bold">{formatDuration(allTime.timeMinutes)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  All-Time · {moment(allTime.session.date).format("MMM D, YYYY")}
                </p>
              </div>
              {season && (
                <div className="pt-2 border-t border-border">
                  <p className="text-sm font-medium">
                    {formatDuration(season.timeMinutes)}
                    {isSeasonBest && <span className="ml-2 text-xs text-primary">(record)</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">This Season</p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}