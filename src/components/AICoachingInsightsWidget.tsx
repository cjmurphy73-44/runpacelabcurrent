import React from 'react';
import { useTelemetryStore } from '../store/useTelemetryStore';
import { getCoachingInsight } from '../lib/aiCoachService';
import { Activity, ShieldCheck, AlertTriangle, Zap } from 'lucide-react';

export const AICoachingInsightsWidget: React.FC = () => {
  const workouts = useTelemetryStore((state) => state.workouts);
  const biometrics = useTelemetryStore((state) => state.biometrics);

  const insight = getCoachingInsight({ workouts, biometrics });

  // Calculate mock or real metrics for ACWR/CTL/ATL
  const totalLoad = workouts.reduce((acc, w) => acc + (w.durationMinutes || 30) * (w.perceivedExertion || 5), 0);
  const ctl = Math.round(totalLoad / 14);
  const atl = Math.round(totalLoad / 7);
  const acwr = ctl > 0 ? Number((atl / ctl).toFixed(2)) : 1.0;

  let statusColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
  let statusText = 'Optimal Load';
  if (acwr > 1.3) {
    statusColor = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    statusText = 'Elevated Caution';
  } else if (acwr > 1.5) {
    statusColor = 'text-rose-400 bg-rose-500/10 border-rose-500/20';
    statusText = 'High Injury Risk';
  }

  return (
    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-blue-400" />
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">AI Coaching & ACWR</h3>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusColor}`}>
          {acwr > 1.3 ? <AlertTriangle className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
          {statusText}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 pt-2">
        <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-800 text-center">
          <div className="text-xs text-slate-400 mb-1">ACWR Ratio</div>
          <div className="font-mono text-lg font-bold text-white tabular-nums">{acwr}</div>
        </div>
        <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-800 text-center">
          <div className="text-xs text-slate-400 mb-1">CTL (Fitness)</div>
          <div className="font-mono text-lg font-bold text-blue-400 tabular-nums">{ctl}</div>
        </div>
        <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-800 text-center">
          <div className="text-xs text-slate-400 mb-1">ATL (Fatigue)</div>
          <div className="font-mono text-lg font-bold text-purple-400 tabular-nums">{atl}</div>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 text-sm text-slate-300 space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 uppercase tracking-wider">
          <Activity className="w-3.5 h-3.5" /> Automated Prescription
        </div>
        <p className="text-xs leading-relaxed text-slate-300">{insight}</p>
      </div>
    </div>
  );
};
