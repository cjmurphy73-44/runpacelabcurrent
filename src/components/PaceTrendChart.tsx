import React from 'react';

interface PaceTrendChartProps {
  dataPoints: { x: number; y: number }[];
}

export const PaceTrendChart: React.FC<PaceTrendChartProps> = ({ dataPoints }) => {
  if (dataPoints.length < 2) return null;

  const pathData = dataPoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');

  return (
    <div className="w-full h-24 mt-4 animate-in fade-in duration-500">
      <svg viewBox="0 0 200 60" className="w-full h-full overflow-visible">
        <path
          d={pathData}
          fill="none"
          className="stroke-indigo-500 stroke-[2] transition-all duration-300"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};
