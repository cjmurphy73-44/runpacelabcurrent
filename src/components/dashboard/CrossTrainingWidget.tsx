import React from 'react';
import { useTelemetry } from '../../hooks/useTelemetry';

interface CrossTrainingWidgetProps {
  recommendation: string;
  recommendationId: string;
}

export const CrossTrainingWidget: React.FC<CrossTrainingWidgetProps> = ({ recommendation, recommendationId }) => {
  const { trackRecommendation } = useTelemetry();

  React.useEffect(() => {
    trackRecommendation('viewed', recommendationId);
  }, [recommendationId, trackRecommendation]);

  const handleAction = (action: 'accepted' | 'dismissed') => {
    trackRecommendation(action, recommendationId);
  };

  return (
    <div className="p-4 border border-blue-500 bg-black text-blue-400 font-mono" data-testid="cross-training-widget">
      <h3 className="text-sm font-bold uppercase mb-2 text-blue-300">Recovery Recommendation</h3>
      <p className="text-sm">{recommendation}</p>
      <div className="mt-4 flex gap-2">
        <button onClick={() => handleAction('accepted')} className="text-xs underline">Accept</button>
        <button onClick={() => handleAction('dismissed')} className="text-xs underline">Dismiss</button>
      </div>
    </div>
  );
};
