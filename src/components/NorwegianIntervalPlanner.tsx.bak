import React from 'react';
import { useNorwegianWorkouts } from '../../hooks/useNorwegianWorkouts';

export interface NorwegianIntervalPlannerProps {
  initialVdot?: number;
}

export const NorwegianIntervalPlanner: React.FC<NorwegianIntervalPlannerProps> = ({ initialVdot = 55 }) => {
  const {
    vdot,
    setVdot,
    format,
    setFormat,
    prescription,
    decouplingResult,
    telemetryInputs,
  } = useNorwegianWorkouts({ initialVdot });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-slate-100 shadow-xl space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-emerald-400 flex items-center gap-2">
            <span>🇳🇴</span> Norwegian Double-Threshold Planner
          </h2>
          <p className="text-sm text-slate-400">
            Lactate-clamped sub-threshold prescription & cardiac decoupling analytics
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* VDOT Selector */}
          <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
            <label htmlFor="vdot-input" className="text-xs font-semibold text-slate-300 uppercase tracking-wider">VDOT</label>
            <input
              id="vdot-input"
              type="number"
              min="30"
              max="85"
              value={vdot}
              onChange={(e) => setVdot(Number(e.target.value))}
              className="w-14 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-center text-sm font-mono text-emerald-300 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Format Toggle */}
          <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
            {(['10x1000', '5x2000', '4x3000'] as const).map((fmt) => (
              <button
                key={fmt}
                onClick={() => setFormat(fmt)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  format === fmt
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {fmt}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Grid: Prescription & Decoupling */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Prescription Card */}
        <div className="lg:col-span-2 bg-slate-950/60 border border-slate-800 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-emerald-400 uppercase bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-800/50">
              Session Prescription: {format}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Total Volume: {(prescription.totalWorkMeters / 1000).toFixed(1)} km work
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800/80">
              <div className="text-xs text-slate-400">Target Pace</div>
              <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                {prescription.formattedPace}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">({prescription.recommendedPaceSecPerKm.toFixed(1)}s/km)</div>
            </div>

            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800/80">
              <div className="text-xs text-slate-400">Lactate Clamp</div>
              <div className="text-xl font-bold font-mono text-cyan-400 mt-1">
                {prescription.targetLactateMin}–{prescription.targetLactateMax}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">mmol/L (Sub-OBLA)</div>
            </div>

            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800/80">
              <div className="text-xs text-slate-400">Target RPE</div>
              <div className="text-xl font-bold font-mono text-amber-400 mt-1">
                {prescription.targetRpe}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Controlled Effort</div>
            </div>

            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800/80">
              <div className="text-xs text-slate-400">Recovery Float</div>
              <div className="text-xl font-bold font-mono text-purple-400 mt-1">
                {prescription.recoverySeconds}s
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Jog between reps</div>
            </div>
          </div>

          {/* Detailed breakdown info */}
          <div className="bg-slate-900/80 p-3.5 rounded-lg border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
            <div>
              <span className="font-semibold text-slate-200">Execution Strategy:</span> Perform {prescription.repeatCount} repetitions of {prescription.repeatDistanceMeters}m with {prescription.recoverySeconds}s active jog float. Keep heart rate steady and blood lactate tightly clamped.
            </div>
          </div>
        </div>

        {/* Cardiac Decoupling Monitor */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-5 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold tracking-wider text-cyan-400 uppercase bg-cyan-950/60 px-2.5 py-1 rounded border border-cyan-800/50">
                Aerobic Decoupling (EF)
              </span>
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                decouplingResult.isExceeded ? 'bg-rose-950 text-rose-400 border border-rose-800' : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
              }`}>
                {decouplingResult.decouplingPct}%
              </span>
            </div>

            <p className="text-xs text-slate-400 mb-3">
              Compares first-half vs. second-half efficiency factor (Speed / HR). Limit: &lt; 5.0%.
            </p>

            <div className={`p-3 rounded-lg text-xs leading-relaxed border ${
              decouplingResult.isExceeded 
                ? 'bg-rose-950/30 border-rose-900/60 text-rose-200' 
                : 'bg-emerald-950/30 border-emerald-900/60 text-emerald-200'
            }`}>
              {decouplingResult.status}
            </div>
          </div>

          {/* Quick Telemetry Adjuster */}
          <div className="space-y-2 pt-3 border-t border-slate-800">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Test Telemetry Sample</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 block">H1: {telemetryInputs.firstHalfAvgSpeed} km/h @ {telemetryInputs.firstHalfAvgHr} bpm</span>
              </div>
              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 block">H2: {telemetryInputs.secondHalfAvgSpeed} km/h @ {telemetryInputs.secondHalfAvgHr} bpm</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
