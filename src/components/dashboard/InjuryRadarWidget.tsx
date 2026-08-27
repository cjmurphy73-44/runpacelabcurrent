import React from 'react';
import { RiskZone } from '../../lib/injuryEngine';

interface InjuryRadarWidgetProps {
  acwr: number;
  zone: RiskZone;
}

export const InjuryRadarWidget: React.FC<InjuryRadarWidgetProps> = ({ acwr, zone }) => {
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
    </div>
  );
};

export default InjuryRadarWidget;
