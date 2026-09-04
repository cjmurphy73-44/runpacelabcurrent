// src/components/WeatherStressWidget.tsx
import React, { useState } from 'react';
import { calculateWeatherStress } from '../science/weatherStress';

export function WeatherStressWidget() {
  const [temperature, setTemperature] = useState<number>(28);
  const [humidity, setHumidity] = useState<number>(75);
  const [altitude, setAltitude] = useState<number>(250);
  const [wind, setWind] = useState<number>(12);
  const [rawTss, setRawTss] = useState<number>(120);

  // Base pace: 4:30 /km = 270 seconds
  const basePaceSec = 270;
  const stressResult = calculateWeatherStress(rawTss, basePaceSec, {
    temperatureC: temperature,
    relativeHumidity: humidity,
    altitudeMeters: altitude,
    windSpeedKmh: wind,
  });

  const formatPace = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = Math.round(sec % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs} /km`;
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Optimal': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'Mild Stress': return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
      case 'Moderate Stress': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'High Stress': return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
      case 'Extreme Hazard': return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      default: return 'text-slate-400 bg-slate-800 border-slate-700';
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-slate-100 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold tracking-wide text-white">Weather &amp; Environmental Stress</h3>
          <p className="text-xs text-slate-400">Environmentally Adjusted rTSS &amp; Pace Corrections</p>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getCategoryColor(stressResult.heatIndexCategory)}`}>
          {stressResult.heatIndexCategory}
        </div>
      </div>

      {/* Interactive Controls */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
        <div>
          <label className="block text-[11px] text-slate-400 uppercase font-medium mb-1">Temp (°C)</label>
          <input
            type="number"
            value={temperature}
            onChange={(e) => setTemperature(Number(e.target.value))}
            className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500"
          />
        </div>
        <div>
          <label className="block text-[11px] text-slate-400 uppercase font-medium mb-1">Humidity (%)</label>
          <input
            type="number"
            min="0"
            max="100"
            value={humidity}
            onChange={(e) => setHumidity(Number(e.target.value))}
            className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500"
          />
        </div>
        <div>
          <label className="block text-[11px] text-slate-400 uppercase font-medium mb-1">Altitude (m)</label>
          <input
            type="number"
            step="100"
            value={altitude}
            onChange={(e) => setAltitude(Number(e.target.value))}
            className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500"
          />
        </div>
        <div>
          <label className="block text-[11px] text-slate-400 uppercase font-medium mb-1">Wind (km/h)</label>
          <input
            type="number"
            value={wind}
            onChange={(e) => setWind(Number(e.target.value))}
            className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500"
          />
        </div>
        <div>
          <label className="block text-[11px] text-slate-400 uppercase font-medium mb-1">Raw TSS</label>
          <input
            type="number"
            value={rawTss}
            onChange={(e) => setRawTss(Number(e.target.value))}
            className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/50">
          <div className="text-xs text-slate-400 uppercase font-medium mb-1">Dew Point</div>
          <div className="text-xl font-bold text-cyan-400">
            {stressResult.dewPointC}°C <span className="text-xs font-normal text-slate-400">({stressResult.dewPointF}°F)</span>
          </div>
        </div>

        <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/50">
          <div className="text-xs text-slate-400 uppercase font-medium mb-1">Adjusted rTSS</div>
          <div className="text-xl font-bold text-white">
            {stressResult.adjustedTss} <span className="text-xs font-normal text-slate-400">({rawTss} raw)</span>
          </div>
        </div>

        <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/50">
          <div className="text-xs text-slate-400 uppercase font-medium mb-1">Adjusted Effort Pace</div>
          <div className="text-xl font-bold text-emerald-400">
            {formatPace(stressResult.adjustedPaceSecondsPerKm)}
          </div>
        </div>

        <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/50">
          <div className="text-xs text-slate-400 uppercase font-medium mb-1">Total Multiplier</div>
          <div className="text-xl font-bold text-cyan-300">
            {Math.round(stressResult.environmentalFactor * 100)}% <span className="text-xs font-normal text-slate-400">strain</span>
          </div>
        </div>
      </div>

      {/* Description & Coaching Guidance */}
      <div className="text-xs text-slate-300 bg-slate-950/40 rounded p-3 border border-slate-800 flex items-start gap-2">
        <span className="font-semibold text-cyan-400 uppercase tracking-wider shrink-0">Guidance:</span>
        <span>{stressResult.description}</span>
      </div>
    </div>
  );
}
