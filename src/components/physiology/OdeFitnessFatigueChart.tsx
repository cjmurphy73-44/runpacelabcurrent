import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Legend,
} from 'recharts';

export interface OdeDataPoint {
  date: string;
  fitness: number; // ODE Fitness state vector
  fatigue: number; // ODE Fatigue state vector
  form: number;    // ODE Form (Fitness - Fatigue)
  trimp?: number;  // Daily TRIMP load bar
}

export interface OdeFitnessFatigueChartProps {
  data: OdeDataPoint[];
  tau1?: number; // Fitness decay constant (default: 42)
  tau2?: number; // Fatigue decay constant (default: 7)
  onTauChange?: (tau1: number, tau2: number) => void;
  isLoading?: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-slate-900/95 border border-slate-700/80 rounded-lg p-3 shadow-xl backdrop-blur-md text-xs font-mono">
      <div className="text-slate-400 font-sans font-semibold mb-2 border-b border-slate-800 pb-1">
        {label}
      </div>
      <div className="space-y-1.5">
        {payload.map((item: any) => {
          const isForm = item.dataKey === 'form';
          const formColor =
            item.value > 0
              ? 'text-emerald-400'
              : item.value < -20
              ? 'text-rose-400'
              : 'text-amber-400';

          return (
            <div key={item.dataKey} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-slate-300 capitalize">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                {item.name}:
              </span>
              <span
                className={`font-semibold tabular-nums ${
                  isForm ? formColor : 'text-slate-100'
                }`}
              >
                {typeof item.value === 'number' ? item.value.toFixed(1) : item.value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const OdeFitnessFatigueChart: React.FC<OdeFitnessFatigueChartProps> = ({
  data = [],
  tau1 = 42,
  tau2 = 7,
  onTauChange,
  isLoading = false,
}) => {
  const [localTau1, setLocalTau1] = useState<number>(tau1);
  const [localTau2, setLocalTau2] = useState<number>(tau2);

  useEffect(() => {
    setLocalTau1(tau1);
  }, [tau1]);

  useEffect(() => {
    setLocalTau2(tau2);
  }, [tau2]);

  const handleTau1Change = (val: number) => {
    const clamped = Math.max(10, Math.min(90, val));
    setLocalTau1(clamped);
    onTauChange?.(clamped, localTau2);
  };

  const handleTau2Change = (val: number) => {
    const clamped = Math.max(2, Math.min(30, val));
    setLocalTau2(clamped);
    onTauChange?.(localTau1, clamped);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg text-slate-100 flex flex-col gap-5">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold tracking-wide text-white">
              ODE Impulse-Response Dynamics
            </h3>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/50">
              State Vectors
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Two-component differential model tracking Fitness (τ₁), Fatigue (τ₂), and Form
          </p>
        </div>

        {/* Dynamic Tau Decay Controls */}
        <div className="flex flex-wrap items-center gap-4 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
          {/* Tau 1 (Fitness) */}
          <div className="flex items-center gap-2">
            <label
              htmlFor="tau1-input"
              className="text-xs font-mono text-cyan-400 flex items-center gap-1 cursor-pointer"
            >
              <span>τ₁ (Fitness):</span>
            </label>
            <input
              type="range"
              min="10"
              max="90"
              step="1"
              value={localTau1}
              onChange={(e) => handleTau1Change(Number(e.target.value))}
              className="w-20 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <input
              id="tau1-input"
              type="number"
              min="10"
              max="90"
              value={localTau1}
              onChange={(e) => handleTau1Change(Number(e.target.value))}
              className="w-12 px-1.5 py-0.5 text-xs font-mono bg-slate-800 border border-slate-700 rounded text-cyan-300 text-center focus:outline-none focus:border-cyan-500"
            />
            <span className="text-[11px] text-slate-500 font-mono">d</span>
          </div>

          <div className="h-4 w-px bg-slate-800 hidden sm:block" />

          {/* Tau 2 (Fatigue) */}
          <div className="flex items-center gap-2">
            <label
              htmlFor="tau2-input"
              className="text-xs font-mono text-rose-400 flex items-center gap-1 cursor-pointer"
            >
              <span>τ₂ (Fatigue):</span>
            </label>
            <input
              type="range"
              min="2"
              max="30"
              step="1"
              value={localTau2}
              onChange={(e) => handleTau2Change(Number(e.target.value))}
              className="w-20 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-rose-400"
            />
            <input
              id="tau2-input"
              type="number"
              min="2"
              max="30"
              value={localTau2}
              onChange={(e) => handleTau2Change(Number(e.target.value))}
              className="w-12 px-1.5 py-0.5 text-xs font-mono bg-slate-800 border border-slate-700 rounded text-rose-300 text-center focus:outline-none focus:border-rose-500"
            />
            <span className="text-[11px] text-slate-500 font-mono">d</span>
          </div>
        </div>
      </div>

      {/* Main Chart Area */}
      <div className="relative w-full h-[360px]">
        {isLoading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-900/70 backdrop-blur-[2px] rounded-lg">
            <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mb-2" />
            <span className="text-xs font-mono text-slate-300">Solving state equations...</span>
          </div>
        )}

        {data.length === 0 && !isLoading ? (
          <div className="w-full h-full flex items-center justify-center border border-dashed border-slate-800 rounded-lg text-slate-500 text-sm">
            No ODE telemetry data available for this range
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 12, right: 16, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="trimpGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#64748b" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#64748b" stopOpacity={0.05} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />

              <XAxis
                dataKey="date"
                stroke="#64748b"
                tick={{ fill: '#64748b', fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: '#334155' }}
              />

              {/* Primary Y-Axis for Continuous State Vectors */}
              <YAxis
                yAxisId="state"
                stroke="#64748b"
                tick={{ fill: '#64748b', fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: '#334155' }}
                domain={['auto', 'auto']}
              />

              {/* Secondary Y-Axis for TRIMP Impulses */}
              <YAxis
                yAxisId="trimp"
                orientation="right"
                stroke="#475569"
                tick={{ fill: '#475569', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                domain={[0, 'dataMax + 40']}
                hide={!data.some((d) => d.trimp !== undefined && d.trimp > 0)}
              />

              {/* Equilibrium Reference Line */}
              <ReferenceLine yAxisId="state" y={0} stroke="#475569" strokeDasharray="4 4" />

              <Tooltip content={<CustomTooltip />} />

              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                iconSize={8}
                wrapperStyle={{
                  paddingBottom: '12px',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                }}
              />

              {/* TRIMP daily impulses (rendered as translucent bars in background) */}
              <Bar
                yAxisId="trimp"
                dataKey="trimp"
                name="TRIMP Impulse"
                fill="url(#trimpGradient)"
                stroke="#475569"
                strokeWidth={0.5}
                radius={[2, 2, 0, 0]}
                barSize={6}
              />

              {/* ODE Fatigue vector */}
              <Line
                yAxisId="state"
                type="monotone"
                dataKey="fatigue"
                name="Fatigue (ODE)"
                stroke="#f43f5e"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, stroke: '#f43f5e', strokeWidth: 1.5, fill: '#881337' }}
              />

              {/* ODE Fitness vector */}
              <Line
                yAxisId="state"
                type="monotone"
                dataKey="fitness"
                name="Fitness (ODE)"
                stroke="#06b6d4"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4, stroke: '#06b6d4', strokeWidth: 1.5, fill: '#164e63' }}
              />

              {/* ODE Form curve */}
              <Line
                yAxisId="state"
                type="monotone"
                dataKey="form"
                name="Form (TSB)"
                stroke="#f59e0b"
                strokeWidth={1.75}
                strokeDasharray="4 2"
                dot={false}
                activeDot={{ r: 4, stroke: '#f59e0b', strokeWidth: 1.5, fill: '#78350f' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Metric Readout Footer */}
      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-800/80 text-center font-mono">
        <div className="bg-slate-950/40 rounded p-2 border border-slate-800/60">
          <div className="text-[10px] uppercase text-cyan-400 font-semibold">Fitness State</div>
          <div className="text-sm font-bold text-slate-100">
            {data.length ? data[data.length - 1].fitness.toFixed(1) : '--'}
          </div>
        </div>
        <div className="bg-slate-950/40 rounded p-2 border border-slate-800/60">
          <div className="text-[10px] uppercase text-rose-400 font-semibold">Fatigue State</div>
          <div className="text-sm font-bold text-slate-100">
            {data.length ? data[data.length - 1].fatigue.toFixed(1) : '--'}
          </div>
        </div>
        <div className="bg-slate-950/40 rounded p-2 border border-slate-800/60">
          <div className="text-[10px] uppercase text-amber-400 font-semibold">Current Form</div>
          <div
            className={`text-sm font-bold ${
              data.length && data[data.length - 1].form >= 0
                ? 'text-emerald-400'
                : 'text-amber-400'
            }`}
          >
            {data.length ? data[data.length - 1].form.toFixed(1) : '--'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OdeFitnessFatigueChart;
