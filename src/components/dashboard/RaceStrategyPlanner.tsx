import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardContent } from '../ui/card';
import { buildRaceSplits, formatSplitPace } from '../../science/racePacing';

export default function RaceStrategyPlanner() {
  const [flatPaceSec, setFlatPaceSec] = useState(270); // 4:30 /km
  const [grade, setGrade] = useState(0); // 0% flat
  const [tempF, setTempF] = useState(68);
  const [humidity, setHumidity] = useState(50);
  const [splitCount, setSplitCount] = useState(10);

  const splits = useMemo(() => {
    return buildRaceSplits({
      flatPaceSecPerKm: flatPaceSec,
      grade: grade / 100,
      airTempF: tempF,
      dewPointF: tempF - ((100 - humidity) / 5),
      splits: splitCount,
    });
  }, [flatPaceSec, grade, tempF, humidity, splitCount]);

  return (
    <Card className="bg-slate-900 border-slate-800 text-slate-100">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Pillar 5: Advanced Race Strategy & Pacing Profile</h3>
            <p className="text-sm text-slate-400">Minetti grade-adjusted pacing, environmental thermal throttle, and glycogen conservation phases.</p>
          </div>
          <span className="px-3 py-1 text-xs font-medium bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20">
            Strategy Engine Active
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-950/60 rounded-xl border border-slate-800">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Target Flat Pace (sec/km)</label>
            <input
              type="number"
              value={flatPaceSec}
              onChange={(e) => setFlatPaceSec(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
            <span className="text-xs text-slate-500 mt-1 block">({formatSplitPace(flatPaceSec)} /km)</span>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Course Grade (%)</label>
            <input
              type="number"
              step="0.5"
              value={grade}
              onChange={(e) => setGrade(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
            <span className="text-xs text-slate-500 mt-1 block">Minetti grade adjustment</span>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Air Temp (°F)</label>
            <input
              type="number"
              value={tempF}
              onChange={(e) => setTempF(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Splits Count</label>
            <select
              value={splitCount}
              onChange={(e) => setSplitCount(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500"
            >
              <option value={5}>5 Splits</option>
              <option value={10}>10 Splits</option>
              <option value={20}>20 Splits</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950 text-slate-400 uppercase text-xs tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Race Progress</th>
                <th className="px-4 py-3">Phase</th>
                <th className="px-4 py-3">Target Pace</th>
                <th className="px-4 py-3">Pace (sec/km)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
              {splits.map((split, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-200">
                    {Math.round(split.distanceFraction * 100)}%
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${
                      split.phase === 'start' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                      split.phase === 'steady' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                      'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}>
                      {split.phase}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-white font-semibold">{split.targetPaceLabel} /km</td>
                  <td className="px-4 py-3 font-mono text-slate-400">{split.targetPaceSecPerKm}s</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
