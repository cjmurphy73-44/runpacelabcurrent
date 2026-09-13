import React, { useState } from 'react';
import { calculateAdaptiveRecommendation, AdaptiveInput, AdaptiveRecommendation } from '../../science/adaptiveEngine';

export interface AutoReplanPreviewCardProps {
  initialInput?: AdaptiveInput;
  onAcceptReplan?: (recommendation: AdaptiveRecommendation) => void;
}

export const AutoReplanPreviewCard: React.FC<AutoReplanPreviewCardProps> = ({
  initialInput = { acwr: 1.38, chronic: 42, acute: 58, rpe: 8 },
  onAcceptReplan,
}) => {
  const [input, setInput] = useState<AdaptiveInput>(initialInput);
  const [recommendation, setRecommendation] = useState<AdaptiveRecommendation>(() =>
    calculateAdaptiveRecommendation(initialInput)
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleInputChange = (field: keyof AdaptiveInput, value: number) => {
    const updated = { ...input, [field]: value };
    setInput(updated);
    setRecommendation(calculateAdaptiveRecommendation(updated));
    setSuccessMessage(null);
  };

  const handleAccept = async () => {
    setIsSyncing(true);
    try {
      // Simulate API sync with backend adaptive coach/reconciliation endpoint
      await new Promise((resolve) => setTimeout(resolve, 600));
      if (onAcceptReplan) {
        onAcceptReplan(recommendation);
      }
      setSuccessMessage('Schedule successfully adapted and pushed to calendar!');
    } catch (err) {
      console.error('Failed to sync replan', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'danger':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'caution':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      default:
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-xl text-slate-100 max-w-xl w-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">Auto-Replanning & Adaptive Engine</h3>
          <p className="text-xs text-slate-400">Live ACWR & fatigue shift preview</p>
        </div>
        <span
          className={`text-xs px-2.5 py-1 rounded-full border font-medium uppercase tracking-wider ${getStatusColor(
            recommendation.status
          )}`}
        >
          {recommendation.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
          <label className="block text-xs text-slate-400 mb-1">ACWR Ratio</label>
          <input
            type="number"
            step="0.01"
            value={input.acwr}
            onChange={(e) => handleInputChange('acwr', parseFloat(e.target.value) || 0)}
            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
          <label className="block text-xs text-slate-400 mb-1">Session RPE (1-10)</label>
          <input
            type="number"
            min="1"
            max="10"
            value={input.rpe}
            onChange={(e) => handleInputChange('rpe', parseInt(e.target.value, 10) || 1)}
            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      <div className="bg-slate-950/60 p-4 rounded-lg border border-slate-800 mb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs uppercase font-semibold text-slate-400">Recommended Shift</span>
          <span className="text-sm font-bold text-indigo-400">
            {recommendation.adjustmentPercentage > 0 ? `+${recommendation.adjustmentPercentage}%` : `${recommendation.adjustmentPercentage}%`} volume
          </span>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">{recommendation.guidanceText}</p>
      </div>

      {successMessage && (
        <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-lg flex items-center gap-2">
          <span>✓</span>
          <span>{successMessage}</span>
        </div>
      )}

      <button
        onClick={handleAccept}
        disabled={isSyncing}
        className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
      >
        {isSyncing ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Syncing Schedule Shift...</span>
          </>
        ) : (
          <span>Accept & Apply Replan to Schedule</span>
        )}
      </button>
    </div>
  );
};

export default AutoReplanPreviewCard;
