'use client';

import React, { useState } from 'react';

interface HeartRateZone {
  name: string;
  minBpm: number;
  maxBpm: number;
}

interface PaceZone {
  name: string;
  minPaceSecondsPerKm: number;
  maxPaceSecondsPerKm: number;
  targetPaceSecondsPerKm: number;
  formattedTargetPace: string;
}

interface ZonesResultData {
  heartRateZones?: {
    method: 'karvonen' | 'percent_max';
    zone1: HeartRateZone;
    zone2: HeartRateZone;
    zone3: HeartRateZone;
    zone4: HeartRateZone;
    zone5: HeartRateZone;
  };
  paceZones?: Record<string, PaceZone>;
}

export default function ZonesCalculator() {
  const [activeTab, setActiveTab] = useState<'hr' | 'pace'>('hr');

  // Heart Rate Inputs
  const [maxHr, setMaxHr] = useState<number>(185);
  const [restingHr, setRestingHr] = useState<number>(55);
  const [useRestingHr, setUseRestingHr] = useState<boolean>(true);

  // Pace Inputs
  const [paceMode, setPaceMode] = useState<'threshold' | 'vdot'>('threshold');
  const [tPaceMinutes, setTPaceMinutes] = useState<number>(4);
  const [tPaceSeconds, setTPaceSeconds] = useState<number>(15);
  const [vdotInput, setVdotInput] = useState<number>(50);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ZonesResultData | null>(null);

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const body: Record<string, any> = {};

    if (activeTab === 'hr') {
      if (!maxHr || maxHr <= 0) {
        setError('Please enter a valid Maximum Heart Rate.');
        setLoading(false);
        return;
      }
      body.maxHr = maxHr;
      if (useRestingHr && restingHr > 0) {
        body.restingHr = restingHr;
      }
    } else {
      if (paceMode === 'threshold') {
        const thresholdPaceSecPerKm = tPaceMinutes * 60 + tPaceSeconds;
        if (thresholdPaceSecPerKm <= 0) {
          setError('Please enter a valid Threshold Pace.');
          setLoading(false);
          return;
        }
        body.thresholdPaceSecPerKm = thresholdPaceSecPerKm;
      } else {
        if (!vdotInput || vdotInput <= 0) {
          setError('Please enter a valid VDOT score.');
          setLoading(false);
          return;
        }
        body.vdot = vdotInput;
      }
    }

    try {
      const response = await fetch('/api/zones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.error || json.message || 'Failed to calculate training zones');
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
      <h2 className="text-2xl font-bold text-slate-800 mb-2">Training Zones Calculator</h2>
      <p className="text-slate-600 text-sm mb-6">
        Calculate physiological Heart Rate target ranges (Karvonen HR Reserve / %Max HR) or Daniels Pace Zones.
      </p>

      {/* Mode Switcher Tabs */}
      <div className="flex border-b border-slate-200 mb-6">
        <button
          type="button"
          onClick={() => {
            setActiveTab('hr');
            setResult(null);
          }}
          className={`pb-3 px-6 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'hr'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Heart Rate Zones
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('pace');
            setResult(null);
          }}
          className={`pb-3 px-6 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'pace'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Pace Zones
        </button>
      </div>

      <form onSubmit={handleCalculate} className="space-y-6">
        {activeTab === 'hr' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Max Heart Rate (bpm)</label>
                <input
                  type="number"
                  min="100"
                  max="240"
                  value={maxHr}
                  onChange={(e) => setMaxHr(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-semibold text-slate-700">Resting Heart Rate (bpm)</label>
                  <label className="inline-flex items-center text-xs text-slate-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useRestingHr}
                      onChange={(e) => setUseRestingHr(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 mr-1"
                    />
                    Use Karvonen
                  </label>
                </div>
                <input
                  type="number"
                  min="30"
                  max="120"
                  disabled={!useRestingHr}
                  value={restingHr}
                  onChange={(e) => setRestingHr(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-400"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-4 mb-2">
              <label className="inline-flex items-center text-sm font-medium text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name="paceMode"
                  value="threshold"
                  checked={paceMode === 'threshold'}
                  onChange={() => setPaceMode('threshold')}
                  className="text-emerald-600 focus:ring-emerald-500 mr-2"
                />
                Threshold Pace
              </label>
              <label className="inline-flex items-center text-sm font-medium text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name="paceMode"
                  value="vdot"
                  checked={paceMode === 'vdot'}
                  onChange={() => setPaceMode('vdot')}
                  className="text-emerald-600 focus:ring-emerald-500 mr-2"
                />
                VDOT Score
              </label>
            </div>

            {paceMode === 'threshold' ? (
              <div className="max-w-xs">
                <label className="block text-sm font-semibold text-slate-700 mb-1">Threshold Pace (per km)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="2"
                    max="15"
                    value={tPaceMinutes}
                    onChange={(e) => setTPaceMinutes(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Min"
                  />
                  <span className="font-bold text-slate-400">:</span>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={tPaceSeconds}
                    onChange={(e) => setTPaceSeconds(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Sec"
                  />
                  <span className="text-sm font-medium text-slate-500">/km</span>
                </div>
              </div>
            ) : (
              <div className="max-w-xs">
                <label className="block text-sm font-semibold text-slate-700 mb-1">VDOT Score</label>
                <input
                  type="number"
                  min="15"
                  max="85"
                  step="0.1"
                  value={vdotInput}
                  onChange={(e) => setVdotInput(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full md:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg shadow transition-colors disabled:opacity-50"
        >
          {loading ? 'Calculating Zones...' : 'Calculate Training Zones'}
        </button>
      </form>

      {/* Results Display */}
      {result && (
        <div className="mt-8 pt-8 border-t border-slate-200 space-y-6">
          {/* Heart Rate Zones Result */}
          {result.heartRateZones && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-800">Heart Rate Target Zones</h3>
                <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full uppercase">
                  {result.heartRateZones.method === 'karvonen' ? 'Karvonen Formula (HR Reserve)' : '% Max Heart Rate'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {Object.entries(result.heartRateZones)
                  .filter(([key]) => key.startsWith('zone'))
                  .map(([key, zone]: [string, any]) => (
                    <div key={key} className="p-4 bg-emerald-50/60 border border-emerald-100 rounded-lg text-center">
                      <p className="text-xs font-bold uppercase text-emerald-800">{key.toUpperCase()}</p>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{zone.name}</p>
                      <p className="text-xl font-extrabold text-slate-900 mt-2">
                        {zone.minBpm} - {zone.maxBpm} <span className="text-xs font-normal text-slate-500">bpm</span>
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Pace Zones Result */}
          {result.paceZones && (
            <div>
              <h3 className="text-lg font-bold text-slate-800 mb-4">Pace Training Zones</h3>
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
        </div>
      )}
    </div>
  );
}
