import React, { useMemo } from "react";
import { useFitness } from "@/context/FitnessContext";
import DistancePBGrid from "@/components/dashboard/DistancePBGrid";
import PeakOutputsGrid from "@/components/dashboard/PeakOutputsGrid";
import { findDistancePBs, findPeakOutputs, seasonFilter } from "@/lib/personalBests";

export default function PersonalBests() {
  const { workoutSessions, loading, isFetched } = useFitness() || {};

  const allTimePBs = useMemo(() => findDistancePBs(workoutSessions || []), [workoutSessions]);
  const seasonPBs = useMemo(() => findDistancePBs(workoutSessions || [], seasonFilter), [workoutSessions]);
  const peakOutputs = useMemo(() => findPeakOutputs(workoutSessions || []), [workoutSessions]);

  if (loading || !isFetched) return <p className="text-sm text-muted-foreground">Loading...</p>;
  if (!workoutSessions || workoutSessions.length === 0) {
    return <p className="text-sm text-muted-foreground">No workouts yet — upload a session to start tracking personal bests.</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 className="font-heading font-bold text-lg mb-3">Race Distance Ledger</h3>
        <DistancePBGrid allTimePBs={allTimePBs} seasonPBs={seasonPBs} />
      </div>
      <div>
        <h3 className="font-heading font-bold text-lg mb-3">Peak Sustained Outputs</h3>
        <PeakOutputsGrid power={peakOutputs.power} pace={peakOutputs.pace} />
      </div>
    </div>
  );
}