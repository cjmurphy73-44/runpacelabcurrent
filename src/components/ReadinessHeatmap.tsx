import React from 'react';
import { ReadinessDay } from '../hooks/useReadinessHistory';

interface ReadinessHeatmapProps {
  data: ReadinessDay[];
}

export const ReadinessHeatmap: React.FC<ReadinessHeatmapProps> = ({ data }) => {
  const getStatusColor = (status: ReadinessDay['status']) => {
    switch (status) {
      case 'optimal': return '#22c55e'; // green-500
      case 'moderate': return '#eab308'; // yellow-500
      case 'fatigued': return '#f43f5e'; // rose-500
      default: return '#94a3b8'; // slate-400
    }
  };

  return (
    <svg viewBox="0 0 320 120" className="w-full h-auto">
      {data.map((day, i) => {
        const x = (i % 7) * 44 + 4;
        const y = Math.floor(i / 7) * 24 + 4;
        return (
          <rect
            key={day.date}
            x={x}
            y={y}
            width={40}
            height={20}
            rx={4}
            fill={getStatusColor(day.status)}
            className="transition-all hover:opacity-80"
          />
        );
      })}
    </svg>
  );
};
