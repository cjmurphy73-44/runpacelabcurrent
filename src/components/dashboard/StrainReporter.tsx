import React from 'react';
import { calculateAdaptiveRecommendation } from '../../science/adaptiveEngine';

interface StrainReporterProps {
  currentAcwr: number;
  chronicLoad: number;
  acuteLoad: number;
  recentRpe?: number;
}

export const StrainReporter: React.FC<StrainReporterProps> = ({
  currentAcwr,
  chronicLoad,
  acuteLoad,
  recentRpe = 5
}) => {
  const recommendation = calculateAdaptiveRecommendation({
    acwr: currentAcwr,
    chronic: chronicLoad,
    acute: acuteLoad,
    rpe: recentRpe
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-950">Adaptive Strain Intelligence</h3>
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
          recommendation.status === 'optimal' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
          recommendation.status === 'caution' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
          'bg-rose-50 text-rose-700 border border-rose-200'
        }`}>
          {recommendation.status.toUpperCase()}
        </span>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
            <span className="text-xs text-slate-500 block">Current ACWR</span>
            <span className="text-xl font-bold text-slate-900">{currentAcwr.toFixed(2)}</span>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
            <span className="text-xs text-slate-500 block">Recommended Adjustment</span>
            <span className="text-xl font-bold text-indigo-600">{recommendation.adjustmentPercentage}%</span>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-3">
          <p className="text-sm text-slate-700 font-medium mb-1">Prescription Guidance:</p>
          <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
            {recommendation.guidanceText}
          </p>
        </div>
      </div>
    </div>
  );
};
