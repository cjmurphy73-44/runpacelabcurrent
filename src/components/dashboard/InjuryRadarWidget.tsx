import React from 'react';
import { getCoachingInsight } from '../../lib/aiCoachService';
import { useCoachingTrends } from '../../hooks/useCoachingTrends';
import { RiskZone } from '../../lib/injuryEngine';

interface InjuryRadarWidgetProps {
  athleteData: any;
  acwr: number;
  zone: RiskZone;
}

export const InjuryRadarWidget: React.FC<InjuryRadarWidgetProps> = ({ athleteData, acwr, zone }) => {
  const { trend } = useCoachingTrends(athleteData);
  const insight = getCoachingInsight(athleteData);

  const zoneColors = {
    Green: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    Yellow: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    Red: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  };

  return (
    <div className={`p-4 rounded-xl border ${zoneColors[zone]} flex flex-col gap-2`}>
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-sm tracking-wide">INJURY RADAR</h3>
        <span className="px-2 py-0.5 rounded-full text-xs font-bold uppercase">{zone} Zone</span>
      </div>
      
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold">{acwr.toFixed(2)}</span>
        <span className="text-xs opacity-80">Acute-to-Chronic Workload Ratio</span>
      </div>

      {/* AI Insight Box */}
      <div className="mt-2 text-sm italic opacity-90">{insight}</div>
      
      {/* Multi-week ACWR Trend Sparkline */}
      <div className="flex gap-1 mt-2">
        {trend.map((val, i) => (
          <span key={i} className={`text-[10px] px-1 rounded ${val > 1.5 ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
            {val.toFixed(1)}
          </span>
        ))}
      </div>
    </div>
  );
};

export default InjuryRadarWidget;
