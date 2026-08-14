'use client';

import React, { useState } from 'react';

const DISTANCE_PRESETS = [
  { label: '5K', meters: 5000 },
  { label: '10K', meters: 10000 },
  { label: 'Half Marathon', meters: 21097.5 },
  { label: 'Marathon', meters: 42195 },
];

interface PaceZone {
  name: string;
  minPaceSecondsPerKm: number;
  maxPaceSecondsPerKm: number;
  targetPaceSecondsPerKm: number;
  formattedTargetPace: string;
}

interface VdotResultData {
  vdot: number;
  equivalentTimes?: Record<string, string>;
  paceZones?: Record<string, PaceZone>;
}

export default function VdotCalculator() {
  const [distanceMeters, setDistanceMeters] = useState<number>(5000);
  const [customKm, setCustomKm] = useState<string>('5.0');
  const [isCustom, setIsCustom] = useState<boolean>(false);

  const [hours, setHours] = useState<number>(0);
  const [minutes, setMinutes] = useState<number>(22);
  const [seconds, setSeconds] = useState<number>(30);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VdotResultData | null>(null);

  const handlePresetSelect = (meters: number) => {
    setIsCustom(false);
    setDistanceMeters(meters);
  };

  const handleCustomKmChange = (val: string) => {
    setCustomKm(val);
    const parsedKm = parseFloat(val);
    if (!isNaN(parsedKm) && parsedKm > 0) {
      setDistanceMeters(parsedKm * 1000);
    }
  };

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    if (totalSeconds <= 0) {
      setError('Please enter a valid race duration.');
      return;
    }

    if (!distanceMeters || distanceMeters <= 0) {
      setError('Please enter a valid race distance.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/vdot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          distanceMeters,
          timeSeconds: totalSeconds,
        }),
      });

      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.error || json.message || 'Failed to calculate VDOT');
      }

      setResult(json.data);
    } catch (err: any) {
      setError(err.message || 'An error occurred while connecting to the API.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-xl shadow-md border border-slate-200">
      <h2 className="text-2xl font-bold text-slate-800 mb-2">Jack Daniels VDOT Calculator</h2>
      <p className="text-slate-600 text-sm mb-6">
        Enter a recent race performance to derive your current VDOT fitness index and optimal training pace zones.
      </p>

      <form onSubmit={handleCalculate} className="space-y-6">
        {/* Distance Selection */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Race Distance</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {DISTANCE_PRESETS.map((preset) => (
              <button
                type="button"
                key={preset.label}
                onClick={() => handlePresetSelect(preset.meters)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  !isCustom && distanceMeters === preset.meters
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {preset.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setIsCustom(true)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                isCustom
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Custom
            </button>
          </div>

          {isCustom && (
            <div className="flex items-center gap-2 max-w-xs">
              <input
                type="number"
                step="0.01"
                min="0.1"
                value={customKm}
                onChange={(e) => handleCustomKmChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Distance in kilometers"
              />
              <span className="text-slate-500 text-sm">km</span>
            </div>
          )}
        </div>

        {/* Time Entry */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Race Time</label>
          <div className="grid grid-cols-3 gap-3 max-w-xs">
            <div>
              <span className="text-xs text-slate-500">Hours</span>
              <input
                type="number"
                min="0"
                max="24"
                value={hours}
                onChange={(e) => setHours(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <span className="text-xs text-slate-500">Minutes</span>
              <input
                type="number"
                min="0"
                max="59"
                value={minutes}
                onChange={(e) => setMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <span className="text-xs text-slate-500">Seconds</span>
              <input
                type="number"
                min="0"
                max="59"
                value={seconds}
                onChange={(e) => setSeconds(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full md:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow transition-colors disabled:opacity-50"
        >
          {loading ? 'Calculating VDOT...' : 'Calculate Training Paces'}
        </button>
      </form>

      {/* Results Display */}
      {result && (
        <div className="mt-8 pt-8 border-t border-slate-200 space-y-8">
          {/* Header Metric Badge */}
          <div className="flex items-center justify-between p-6 bg-gradient-to-r from-blue-900 to-indigo-900 rounded-xl text-white shadow-lg">
            <div>
              <p className="text-xs uppercase tracking-wider text-blue-200">Calculated Score</p>
              <h3 className="text-4xl font-extrabold">{result.vdot.toFixed(1)} <span className="text-lg font-normal text-blue-200">VDOT</span></h3>
            </div>
            <div className="text-right text-xs text-blue-200">
              Jack Daniels Formula
            </div>
          </div>

          {/* Pace Zones */}
          {result.paceZones && (
            <div>
              <h4 className="text-lg font-bold text-slate-800 mb-3">Training Pace Zones</h4>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {Object.entries(result.paceZones).map(([key, zone]) => (
                  <div key={key} className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-center">
                    <p className="text-xs font-semibold uppercase text-slate-500">{zone.name}</p>
                    <p className="text-xl font-bold text-slate-900 mt-1">{zone.formattedTargetPace}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Equivalent Race Times */}
          {result.equivalentTimes && (
            <div>
              <h4 className="text-lg font-bold text-slate-800 mb-3">Equivalent Race Times</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(result.equivalentTimes).map(([dist, timeStr]) => (
                  <div key={dist} className="p-3 bg-blue-50/50 border border-blue-100 rounded-lg">
                    <p className="text-xs font-medium text-blue-800 uppercase">{dist}</p>
                    <p className="text-base font-semibold text-slate-900 mt-0.5">{timeStr}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
