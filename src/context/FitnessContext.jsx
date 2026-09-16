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
  // Map DailyMetrics (now carrying wearable-sourced HRV / sleep / resting HR / readiness) into
  // the biometricTelemetry shape the recovery cards expect, so automated ingestion from Garmin
  // Health and COROS lights up the Recovery Lab and Readiness cards without manual logging.
  const chrono = [...metrics].reverse();
  const biometricTelemetry = chrono.map((m) => ({
    id: m.id,
    date: m.date,
    hrv_ms: m.hrv ?? null,
    sleep_score: m.sleep_score ?? null,
    sleep_duration_hours: m.sleep_duration_hours ?? null,
    resting_hr: m.resting_hr ?? null,
    body_battery: m.body_battery ?? null,
    stress_score: m.stress_score ?? null,
    readiness_score: m.readiness_score ?? null,
    provider_readiness_score: m.provider_readiness_score ?? null,
    provider_readiness_source: m.provider_readiness_source ?? null,
    recovery_source: m.recovery_source ?? null,
  }));

  return {
    dailyMetrics: chrono,
    workoutSessions: sessions,
    biometricTelemetry,
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