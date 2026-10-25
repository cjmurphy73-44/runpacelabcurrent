export function useCoachingTrends(_athleteData?: any) {
  return {
    trend: [1.2, 1.4, 1.6] as number[],
    trends: { weeklyLoad: 0, complianceRate: 0, formScore: 0 },
    loading: false
  };
}
