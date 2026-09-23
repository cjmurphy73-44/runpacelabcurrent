import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServices } from "../services/providers/ServiceContext";
import { computeHolisticReadiness } from "@/science/readiness";

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
    queryKey: ["dailyMetrics", athleteId, visibleRange],
    queryFn: () => dailyMetricsRepo.filter({ athlete_id: athleteId }, "-date", visibleRange),
    enabled: !!athleteId,
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev,
  });

  const { data: sessionData, isLoading: sessionLoading, isFetched: sessionFetched, refetch: refetchSessions } = useQuery({
    queryKey: ["workoutSessions", athleteId, visibleRange],
    queryFn: () => workoutSessionRepo.filter({ athlete_id: athleteId }, "-date", visibleRange),
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

  // readinessForecast — resolves the contract DashboardMetricBanner already reads.
  // currentReadiness is the holistic score for the most recent day with biometric
  // signal (using a trailing baseline from the visible window). projectedReadiness
  // mirrors current until a forward load model is wired in. null when no signal.
  const readinessForecast = useMemo(() => {
    if (!chrono.length) return null;
    const latest = chrono[chrono.length - 1];
    const hrvValues = chrono.map((m) => m.hrv).filter((v) => typeof v === "number" && v > 0);
    const rhrValues = chrono.map((m) => m.resting_hr).filter((v) => typeof v === "number" && v > 0);
    const hrvMean = hrvValues.length ? hrvValues.reduce((a, b) => a + b, 0) / hrvValues.length : null;
    const hrvStdDev = hrvValues.length > 1
      ? Math.sqrt(hrvValues.reduce((s, v) => s + (v - hrvMean) ** 2, 0) / hrvValues.length)
      : null;
    const restingHrMean = rhrValues.length ? rhrValues.reduce((a, b) => a + b, 0) / rhrValues.length : null;
    const result = computeHolisticReadiness(
      { hrvMs: latest.hrv ?? null, sleepScore: latest.sleep_score ?? null, restingHr: latest.resting_hr ?? null },
      { hrvMean, hrvStdDev, restingHrMean }
    );
    if (result.status === "Insufficient Data") return null;
    return { currentReadiness: result.score, projectedReadiness: result.score };
  }, [chrono]);

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
    readinessForecast,
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