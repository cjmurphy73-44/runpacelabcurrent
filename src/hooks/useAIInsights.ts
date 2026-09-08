import { useState, useEffect } from 'react';
import { calculateReadiness, getCoachingAdvice } from '../utils/aiInsightsEngine';

export const useAIInsights = (recent: number, chronic: number) => {
    const [insights, setInsights] = useState({ readiness: 1.0, advice: '' });

    useEffect(() => {
        const readiness = calculateReadiness(recent, chronic);
        const advice = getCoachingAdvice(readiness);
        setInsights({ readiness, advice });
    }, [recent, chronic]);

    return insights;
};
