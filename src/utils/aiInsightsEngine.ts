/**
 * AI Insights Engine
 * Processes workload and activity streams to provide actionable coaching insights.
 */

export const calculateReadiness = (recentWorkload: number, chronicWorkload: number): number => {
    if (chronicWorkload === 0) return 1.0;
    return recentWorkload / chronicWorkload;
};

export const getCoachingAdvice = (readiness: number): string => {
    if (readiness > 1.5) return "High strain: Prioritize recovery.";
    if (readiness < 0.8) return "Low strain: Consider increasing intensity.";
    return "Balanced: Maintain current trajectory.";
};
