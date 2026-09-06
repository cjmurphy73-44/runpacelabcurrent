import React from 'react';
import { useTelemetryStore } from '../store/useTelemetryStore';
import { RecoveryWidget } from '../components/RecoveryWidget';

export const IntelligenceDashboard: React.FC = () => {
  const workouts = useTelemetryStore((state) => state.workouts);
  const biometrics = useTelemetryStore((state) => state.biometrics);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">TrainPaceLab Intelligence</h1>
            <p className="text-sm text-slate-400">Clinical Dual-Axis Recovery & Multi-Sport Load Monitoring</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Telemetry Active
            </span>
          </div>
        </header>

        {/* Main Intelligence Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Recovery Intelligence & Biometrics */}
          <div className="lg:col-span-1 space-y-6 min-w-0">
            <RecoveryWidget />
            
            {/* Quick Biometric Status Card */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Latest Biometrics</h3>
              {biometrics.length > 0 ? (
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">Resting Heart Rate</span>
                    <span className="font-mono font-medium tabular-nums">{biometrics[biometrics.length - 1].restingHeartRate} bpm</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">HRV (RMSSD)</span>
                    <span className="font-mono font-medium tabular-nums">{biometrics[biometrics.length - 1].hrvMs} ms</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">Sleep Score</span>
                    <span className="font-mono font-medium tabular-nums">{biometrics[biometrics.length - 1].sleepScore} / 100</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No morning biometrics logged yet today.</p>
              )}
            </div>
          </div>

          {/* Right Columns: Workouts & Load Analysis */}
          <div className="lg:col-span-2 space-y-6 min-w-0">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold tracking-wide">Recent Training Sessions</h3>
                <span className="text-xs text-slate-400 tabular-nums">Total Logged: {workouts.length}</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs text-slate-400 uppercase">
                      <th className="pb-3 font-medium">Date</th>
                      <th className="pb-3 font-medium">Modality</th>
                      <th className="pb-3 font-medium">Duration</th>
                      <th className="pb-3 font-medium">Avg HR</th>
                      <th className="pb-3 font-medium">RPE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                    {workouts.slice(-5).map((w) => (
                      <tr key={w.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 text-slate-300">{w.date}</td>
                        <td className="py-3 capitalize text-blue-400 font-sans font-medium">{w.modality}</td>
                        <td className="py-3 tabular-nums text-slate-300">{w.durationMinutes} min</td>
                        <td className="py-3 tabular-nums text-slate-300">{w.averageHr} bpm</td>
                        <td className="py-3 tabular-nums text-slate-300">{w.perceivedExertion} / 10</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
