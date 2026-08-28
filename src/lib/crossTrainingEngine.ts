/**
 * Logic to detect fatigue threshold and suggest cross-training.
 * Triggers:
 * 1. 2 or more consecutive "fatigued" days in history.
 * 2. Active "injury-hold" or "fatigued" flag.
 */

export type ReadinessStatus = 'optimal' | 'fatigued' | 'injury-hold';

export interface ReadinessRecord {
  date: string;
  status: ReadinessStatus;
}

export const analyzeFatigue = (history: ReadinessRecord[]): { 
  shouldCrossTrain: boolean; 
  recommendation: string | null 
} => {
  if (!history || history.length === 0) {
    return { shouldCrossTrain: false, recommendation: null };
  }

  // Check for active injury-hold
  const latest = history[history.length - 1];
  if (latest.status === 'injury-hold') {
    return { 
      shouldCrossTrain: true, 
      recommendation: 'Injury-hold active: Switch to low-impact swimming or complete rest.' 
    };
  }

  // Check for consecutive fatigue (last 2 days)
  if (history.length >= 2) {
    const last = history[history.length - 1];
    const prev = history[history.length - 2];
    
    if (last.status === 'fatigued' && prev.status === 'fatigued') {
      return { 
        shouldCrossTrain: true, 
        recommendation: 'Consecutive fatigue detected: Recommend indoor cycling on magnetic trainer to maintain aerobic conditioning.' 
      };
    }
  }

  return { shouldCrossTrain: false, recommendation: null };
};
