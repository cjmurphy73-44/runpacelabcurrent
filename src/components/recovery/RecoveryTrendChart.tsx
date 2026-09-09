import React from 'react';

export interface RecoveryTrendData {
  date: string;
  hrv: number;
  sleep: number;
  readiness: number;
  rhr: number;
}

interface RecoveryTrendProps {
  data: RecoveryTrendData[];
  title: string;
}

export const RecoveryTrendChart: React.FC<RecoveryTrendProps> = ({ data, title }) => {
  // SVG Configuration
  const width = 600;
  const height = 150;
  const padding = 20;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  // Helpers for scaling (assuming normalized data 0-1 for readiness/sleep)
  const getX = (index: number) => padding + (index / (data.length - 1)) * innerWidth;
  const getY = (value: number) => padding + innerHeight - value * innerHeight;

  // Build path string for readiness line
  const readinessPoints = data
    .map((p, i) => `${getX(i)},${getY(p.readiness)}`)
    .join(' ');

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 min-w-0">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">{title}</h3>
      
      {/* SVG Trend Graph */}
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto mb-4 overflow-visible">
        {/* Secondary Metric: RHR/HRV Bars */}
        {data.map((point, i) => (
          <rect
            key={`rhr-${point.date}`}
            x={getX(i) - 2}
            y={getY(point.rhr / 100)} // Rough scaling for demo
            width="4"
            height={innerHeight - getY(point.rhr / 100)}
            className="fill-slate-200"
          />
        ))}

        {/* Primary Metric: Readiness Line */}
        <polyline
          fill="none"
          stroke="#3b82f6"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={readinessPoints}
        />
      </svg>

      {/* Tabular Data Footer */}
      <div className="overflow-x-auto">
        <div className="flex space-x-4 tabular-nums text-slate-600">
          {data.map((point) => (
            <div key={point.date} className="flex flex-col items-center text-xs">
              <span className="truncate">{point.date}</span>
              <span className="font-mono font-bold text-slate-800">
                {Math.round(point.readiness * 100)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
