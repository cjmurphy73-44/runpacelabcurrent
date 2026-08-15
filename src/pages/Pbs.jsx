import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useFitness } from "@/context/FitnessContext";
import DistancePBGrid from "@/components/dashboard/DistancePBGrid";
import PeakOutputsGrid from "@/components/dashboard/PeakOutputsGrid";
import { findDistancePBs, findPeakOutputs, seasonFilter } from "@/lib/personalBests";
import { Trophy } from "lucide-react";

export default function Pbs() {
  const { workoutSessions, loading, isFetched } = useFitness() || {};
  const [sport, setSport] = useState("running");

  const allTimePBs = useMemo(
    () => findDistancePBs(workoutSessions || [], sport),
    [workoutSessions, sport]
  );
  const seasonPBs = useMemo(
    () => findDistancePBs(workoutSessions || [], sport, seasonFilter),
    [workoutSessions, sport]
  );
  const peakOutputs = useMemo(() => findPeakOutputs(workoutSessions || []), [workoutSessions]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-accent-amber" /> Race &amp; Activity Ledger
          </CardTitle>
          <CardDescription>
            Personal records and deep segment splits categorized by discipline, derived live from your uploaded sessions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="inline-flex bg-muted p-1 rounded-xl">
            {[
              { key: "running", label: "🏃 Running PBs" },
              { key: "cycling", label: "🚴 Cycling Records" },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setSport(t.key)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  sport === t.key ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {loading || !isFetched ? (
            <p className="text-sm text-muted-foreground">Loading ledger…</p>
          ) : !workoutSessions || workoutSessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No sessions recorded yet — upload a workout to start building your ledger.
            </p>
          ) : (
            <div className="space-y-8 pt-2">
              <div>
                <h3 className="font-heading font-bold text-lg mb-3">Race Distance Ledger ({sport})</h3>
                <DistancePBGrid allTimePBs={allTimePBs} seasonPBs={seasonPBs} />
              </div>
              <div>
                <h3 className="font-heading font-bold text-lg mb-3">Peak Sustained Outputs</h3>
                <PeakOutputsGrid power={peakOutputs.power} pace={peakOutputs.pace} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}