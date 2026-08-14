'use client';

import React, { useState } from 'react';

interface WeatherAdjustResult {
  dewPointC: number;
  dewPointF: number;
  heatStressFactor: number;
  altitudeFactor: number;
  totalPaceMultiplier: number;
  adjustedPaceSecondsPerKm: number;
  originalPaceSecondsPerKm: number;
  paceImpactSecondsPerKm: number;
  formattedAdjustedPace: string;
}

export default function WeatherAdjuster() {
  const [paceMinutes, setPaceMinutes] = useState<number>(4);
  const [paceSeconds, setPaceSeconds] = useState<number>(30);

  const [tempUnit, setTempUnit] = useState<'C' | 'F'>('C');
  const [tempValue, setTempValue] = useState<number>(28); // 28°C default
  const [relativeHumidity, setRelativeHumidity] = useState<number>(75);
  const [altitudeMeters, setAltitudeMeters] = useState<number>(0);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<WeatherAdjustResult | null>(null);

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const targetPaceSecondsPerKm = paceMinutes * 60 + paceSeconds;
    if (targetPaceSecondsPerKm <= 0) {
      setError('Please enter a valid target pace.');
      return;
    }

    // Convert temp to Celsius if user entered Fahrenheit
    const temperatureC = tempUnit === 'F' ? ((tempValue - 32) * 5) / 9 : tempValue;

    setLoading(true);

    try {
      const response = await fetch('/api/weather-adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetPaceSecondsPerKm,
          temperatureC: Math.round(temperatureC * 10) / 10,
          relativeHumidity,
          altitudeMeters: altitudeMeters || 0,
        }),
      });

      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.error || json.message || 'Failed to calculate pace adjustment');
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
      <h2 className="text-2xl font-bold text-slate-800 mb-2">Weather & Altitude Pace Adjuster</h2>
      <p className="text-slate-600 text-sm mb-6">
        Adjust target running paces for heat stress, dew point, relative humidity, and altitude penalties.
      </p>

      <form onSubmit={handleCalculate} className="space-y-6">
        {/* Target Pace Input */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Target Pace (per km)</label>
          <div className="flex items-center gap-3 max-w-xs">
            <div>
              <span className="text-xs text-slate-500">Minutes</span>
              <input
                type="number"
                min="2"
                max="15"
                value={paceMinutes}
                onChange={(e) => setPaceMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <span className="text-xl font-bold text-slate-400 mt-4">:</span>
            <div>
              <span className="text-xs text-slate-500">Seconds</span>
              <input
                type="number"
                min="0"
                max="59"
                value={paceSeconds}
                onChange={(e) => setPaceSeconds(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <span className="text-sm font-medium text-slate-500 mt-4">/km</span>
          </div>
        </div>

        {/* Environmental Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {/* Temperature */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-semibold text-slate-700">Temperature</label>
              <div className="inline-flex rounded-md shadow-sm text-xs">
                <button
                  type="button"
                  onClick={() => {
                    if (tempUnit === 'F') setTempValue(Math.round(((tempValue - 32) * 5) / 9));
                    setTempUnit('C');
                  }}
                  className={`px-2.5 py-1 rounded-l-md font-semibold ${
                    tempUnit === 'C' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  °C
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (tempUnit === 'C') setTempValue(Math.round((tempValue * 9) / 5 + 32));
                    setTempUnit('F');
                  }}
                  className={`px-2.5 py-1 rounded-r-md font-semibold ${
                    tempUnit === 'F' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  °F
                </button>
              </div>
            </div>
            <input
              type="number"
              value={tempValue}
              onChange={(e) => setTempValue(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Humidity Slider */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-semibold text-slate-700">Relative Humidity</label>
              <span className="text-sm font-bold text-amber-700">{relativeHumidity}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={relativeHumidity}
              onChange={(e) => setRelativeHumidity(parseInt(e.target.value))}
              className="w-full accent-amber-600 mt-2"
            />
          </div>

          {/* Altitude Input */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Altitude (meters)</label>
            <input
              type="number"
              min="0"
              max="9000"
              step="50"
              value={altitudeMeters}
              onChange={(e) => setAltitudeMeters(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="0 (Sea Level)"
            />
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
          className="w-full md:w-auto px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg shadow transition-colors disabled:opacity-50"
        >
          {loading ? 'Calculating Adjustment...' : 'Adjust Pace'}
        </button>
      </form>

      {/* Results Section */}
      {result && (
        <div className="mt-8 pt-8 border-t border-slate-200 space-y-6">
          <div className="flex flex-col md:flex-row items-center justify-between p-6 bg-gradient-to-r from-amber-600 to-orange-700 rounded-xl text-white shadow-lg gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-amber-100">Environmentally Adjusted Pace</p>
              <h3 className="text-4xl font-extrabold mt-1">{result.formattedAdjustedPace}</h3>
            </div>
            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-sm font-bold text-white">
                +{result.paceImpactSecondsPerKm} sec/km slowdown
              </span>
            </div>
          </div>

          {/* Breakdown Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-lg">
              <p className="text-xs font-semibold text-amber-800 uppercase">Dew Point</p>
              <p className="text-xl font-bold text-slate-900 mt-1">
                {result.dewPointC}°C <span className="text-sm font-normal text-slate-500">({result.dewPointF}°F)</span>
              </p>
            </div>
            <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-lg">
              <p className="text-xs font-semibold text-amber-800 uppercase">Heat Stress</p>
              <p className="text-xl font-bold text-slate-900 mt-1">
                {((result.heatStressFactor - 1) * 100).toFixed(1)}%
              </p>
            </div>
            <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-lg">
              <p className="text-xs font-semibold text-amber-800 uppercase">Altitude Impact</p>
              <p className="text-xl font-bold text-slate-900 mt-1">
                {((result.altitudeFactor - 1) * 100).toFixed(1)}%
              </p>
            </div>
            <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-lg">
              <p className="text-xs font-semibold text-amber-800 uppercase">Total Pace Multiplier</p>
              <p className="text-xl font-bold text-slate-900 mt-1">{result.totalPaceMultiplier}x</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
