import { useState } from 'react';
export function useCoachingTrends() {
  const [trends] = useState({ weeklyLoad: 0, complianceRate: 0, formScore: 0 });
  return { trends, loading: false };
}
