import React, { createContext, useContext, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const FitnessContext = createContext(null);

async function fetchFitnessData(athleteId) {
  // BiometricTelemetry / PhysiologicalBaselines were superseded by DailyMetrics (which now carries
  // hrv / sleep_score / resting_hr / readiness_score). Those entity reads 404'd on every dashboard
  // mount and — because Promise.all rejects on any failure — also blocked dailyMetrics/workoutSessions.
  const [metrics, sessions] = await Promise.all([
    base44.entities.DailyMetrics.filter({ athlete_id: athleteId }, "-date", 180),
    base44.entities.WorkoutSession.filter({ athlete_id: athleteId }, "-date", 180),
  ]);
  return {
    dailyMetrics: [...metrics].reverse(),
    workoutSessions: sessions,
    biometricTelemetry: [],
    physiologicalBaselines: [],
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