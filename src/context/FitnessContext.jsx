import React, { createContext, useContext, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServices } from "../services/providers/ServiceContext";

const FitnessContext = createContext(null);

export function FitnessProvider({ athleteId, children }) {
  const [visibleRange, setVisibleRange] = useState(() => {
    const saved = localStorage.getItem("fitness_visible_range");
    return saved ? parseInt(saved, 10) : (athleteId ? 30 : 14);
  });

  useEffect(() => {
    localStorage.setItem("fitness_visible_range", visibleRange.toString());
  }, [visibleRange]);

  const { dailyMetricsRepo, workoutSessionRepo } = useServices();
  
  const { data: metricsData, isLoading: metricsLoading, isFetched: metricsFetched, refetch: refetchMetrics } = useQuery({
    queryKey: ["dailyMetrics", athleteId],
    queryFn: () => dailyMetricsRepo.list({ athlete_id: athleteId }),
    enabled: !!athleteId,
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev,
  });

  const { data: sessionData, isLoading: sessionLoading, isFetched: sessionFetched, refetch: refetchSessions } = useQuery({
    queryKey: ["workoutSessions", athleteId],
    queryFn: () => workoutSessionRepo.list({ athlete_id: athleteId }),
    enabled: !!athleteId,
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev,
  });

  const isLoading = metricsLoading || sessionLoading;
  const isFetched = metricsFetched && sessionFetched;
  const refetch = async () => {
    await Promise.all([refetchMetrics(), refetchSessions()]);
  };

  const metrics = metricsData || [];
  const sessions = sessionData || [];
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

  const data = {
    dailyMetrics: chrono,
    workoutSessions: sessions,
    biometricTelemetry,
    physiologicalBaselines: [],
  };

  const isInitialLoading = isLoading && !data?.dailyMetrics?.length;
  const isRefetching = isLoading && !!data?.dailyMetrics?.length;

  const value = {
    dailyMetrics: data?.dailyMetrics || [],
    workoutSessions: data?.workoutSessions || [],
    biometricTelemetry: data?.biometricTelemetry || [],
    physiologicalBaselines: data?.physiologicalBaselines || [],
    loading: isInitialLoading,
    isInitialLoading,
    isRefetching,
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