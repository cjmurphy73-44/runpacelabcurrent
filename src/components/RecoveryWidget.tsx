import React, { useMemo } from 'react';
import { useTelemetryStore } from '../store/useTelemetryStore';
import { computeRecoveryScores } from '../utils/recoveryEngine';
import { Activity, ShieldCheck, HeartPulse, Zap } from 'lucide-react';

export const RecoveryWidget: React.FC = () => {
  const workouts = useTelemetryStore((state) => state.workouts);
  const biometrics = useTelemetryStore((state) => state.biometrics);

  const latestBiometrics = biometrics[biometrics.length - 1];
  const scores = useMemo(() => computeRecoveryScores(workouts, latestBiometrics), [workouts, latestBiometrics]);

  const getScoreColor = (val: number) => {
    if (val >= 80) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (val >= 60) return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    if (val >= 40) return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
  };

  return (
    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-6 min-w-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <h3 className="text-base font-semibold text-white tracking-wide">Recovery & Readiness Intelligence</h3>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getScoreColor(scores.overallReadiness)}`}>
          {scores.statusLabel}
        </span>
      </div>

      {/* Overall Score Banner */}
      <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
        <div>
          <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">Composite Readiness</span>
          <p className="text-2xl font-bold font-mono tabular-nums text-white mt-0.5">{scores.overallReadiness}%</p>
        </div>
        <div className="text-right">
          <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">Recommended Modality</span>
          <p className="text-sm font-semibold capitalize text-blue-400 mt-0.5 flex items-center justify-end gap-1.5">
            <Activity className="w-4 h-4" />
            {scores.recommendedModality}
          </p>
        </div>
      </div>

      {/* Dual Axis Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <HeartPulse className="w-3.5 h-3.5 text-rose-400" />
              Cardio
            </span>
            <span className="font-mono font-bold tabular-nums text-white">{scores.cardiovascularReadiness}%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-rose-500 h-full rounded-full transition-all duration-500" 
              style={{ width: `${scores.cardiovascularReadiness}%` }}
            />
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Neuromuscular
            </span>
            <span className="font-mono font-bold tabular-nums text-white">{scores.neuromuscularReadiness}%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-amber-500 h-full rounded-full transition-all duration-500" 
              style={{ width: `${scores.neuromuscularReadiness}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
