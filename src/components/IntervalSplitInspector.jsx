import React, { useState } from 'react';

export const IntervalSplitInspector = ({ splits = [] }) => {
  const [selectedInterval, setSelectedInterval] = useState(null);

  // Fallback sample split data if none provided
  const displaySplits = splits.length > 0 ? splits : [
    { lap: 1, distanceKm: 1.0, durationSec: 215, pace: '3:35 /km', avgHr: 162, gradeAdjustedPace: '3:32 /km' },
    { lap: 2, distanceKm: 1.0, durationSec: 218, pace: '3:38 /km', avgHr: 168, gradeAdjustedPace: '3:35 /km' },
    { lap: 3, distanceKm: 1.0, durationSec: 214, pace: '3:34 /km', avgHr: 171, gradeAdjustedPace: '3:34 /km' },
    { lap: 4, distanceKm: 1.0, durationSec: 212, pace: '3:32 /km', avgHr: 174, gradeAdjustedPace: '3:30 /km' },
    { lap: 5, distanceKm: 1.0, durationSec: 210, pace: '3:30 /km', avgHr: 178, gradeAdjustedPace: '3:28 /km' },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Interval Split Inspector</h3>
          <p className="text-xs text-slate-500">Analyze lap-by-lap pacing, heart rate drift, and grade adjustments.</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <th className="py-3 px-4">Lap</th>
              <th className="py-3 px-4">Distance</th>
              <th className="py-3 px-4">Pace</th>
              <th className="py-3 px-4">GAP</th>
              <th className="py-3 px-4">Avg HR</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {displaySplits.map((split) => (
              <tr 
                key={split.lap} 
                onClick={() => setSelectedInterval(split)}
                className={`cursor-pointer transition-colors hover:bg-slate-50 ${selectedInterval?.lap === split.lap ? 'bg-blue-50/50' : ''}`}
              >
                <td className="py-3 px-4 font-medium text-slate-900">Lap {split.lap}</td>
                <td className="py-3 px-4 text-slate-600">{split.distanceKm} km</td>
                <td className="py-3 px-4 font-semibold text-slate-900">{split.pace}</td>
                <td className="py-3 px-4 text-slate-600">{split.gradeAdjustedPace}</td>
                <td className="py-3 px-4 text-slate-600">{split.avgHr} bpm</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedInterval && (
        <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between text-sm">
          <div>
            <span className="font-semibold text-slate-900">Selected: Lap {selectedInterval.lap}</span>
            <span className="ml-3 text-slate-500">Duration: {Math.floor(selectedInterval.durationSec / 60)}m {selectedInterval.durationSec % 60}s</span>
          </div>
          <button 
            onClick={() => setSelectedInterval(null)}
            className="text-xs font-medium text-blue-600 hover:text-blue-800"
          >
            Clear Selection
          </button>
        </div>
      )}
    </div>
  );
};

export default IntervalSplitInspector;
