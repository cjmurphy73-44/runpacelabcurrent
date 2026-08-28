export interface ReadinessDay {
  date: string;
  score: number;
  status: 'optimal' | 'moderate' | 'fatigued';
}

export const useReadinessHistory = () => {
  // Mock data for the last 30 days
  const data: ReadinessDay[] = Array.from({ length: 30 }).map((_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    const score = Math.floor(Math.random() * 100);
    let status: 'optimal' | 'moderate' | 'fatigued' = 'moderate';
    if (score > 75) status = 'optimal';
    else if (score < 40) status = 'fatigued';
    
    return {
      date: date.toISOString().split('T')[0],
      score,
      status,
    };
  });

  return { data, loading: false };
};
