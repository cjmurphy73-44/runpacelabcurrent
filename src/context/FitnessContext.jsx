import React, { createContext, useContext, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const FitnessContext = createContext(null);

async function fetchFitnessData(athleteId) {
  const [metrics, sessions, biometrics, baselines] = await Promise.all([
    base44.entities.DailyMetrics.filter({ athlete_id: athleteId }, "-date", 180),
    base44.entities.WorkoutSession.filter({ athlete_id: athleteId }, "-date", 180),
    base44.entities.BiometricTelemetry.filter({ athlete_id: athleteId }, "-date", 180),
    base44.entities.PhysiologicalBaselines.filter({ athlete_id: athleteId }, "-recorded_date", 100),
  ]);
  return {
    dailyMetrics: [...metrics].reverse(),
    workoutSessions: sessions,
    biometricTelemetry: biometrics,
    physiologicalBaselines: baselines,
  };
}

export function FitnessProvider({ athleteId, children }) {
  const [visibleRange, setVisibleRange] = useState(30);

  const { data, isLoading, isFetched, refetch } = useQuery({
    queryKey: ["fitnessData", athleteId],
    queryFn: () => fetchFitnessData(athleteId),
    enabled: !!athleteId,
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev,
  });

  const value = {
    dailyMetrics: data?.dailyMetrics || [],
    workoutSessions: data?.workoutSessions || [],
    biometricTelemetry: data?.biometricTelemetry || [],
    physiologicalBaselines: data?.physiologicalBaselines || [],
    loading: isLoading && !data,
    isFetched,
    visibleRange,
    setVisibleRange,
    reload: refetch,
  };

  return <FitnessContext.Provider value={value}>{children}</FitnessContext.Provider>;
}

export function useFitness() {
  return useContext(FitnessContext);
}