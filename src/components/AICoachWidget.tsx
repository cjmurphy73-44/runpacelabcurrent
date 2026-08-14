'use client';

import React, { useState } from 'react';

export default function AICoachWidget() {
  const [vdot, setVdot] = useState<number>(50);
  const [temp, setTemp] = useState<number>(27);
  const [humidity, setHumidity] = useState<number>(75);
  const [query, setQuery] = useState<string>('Should I adjust my long run today?');
  
  const [loading, setLoading] = useState<boolean>(false);
  const [response, setResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAskCoach = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/ai-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vdot, temperatureC: temp, humidity, query }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to fetch AI coach advice');
      }

      setResponse(json.data.recommendation);
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-6 rounded-2xl shadow-xl border border-indigo-800/50">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-lg shadow-inner">
          🤖
        </div>
        <div>
          <h3 className="text-lg font-bold">RPL AI Running Coach</h3>
          <p className="text-xs text-indigo-200">Contextual training intelligence based on your stats & weather</p>
        </div>
      </div>

      <form onSubmit={handleAskCoach} className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-indigo-300 mb-1">VDOT</label>
            <input
              type="number"
              value={vdot}
              onChange={(e) => setVdot(parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg text-sm text-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs text-indigo-300 mb-1">Temp (°C)</label>
            <input
              type="number"
              value={temp}
              onChange={(e) => setTemp(parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg text-sm text-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs text-indigo-300 mb-1">Humidity (%)</label>
            <input
              type="number"
              value={humidity}
              onChange={(e) => setHumidity(parseInt(e.target.value) || 0)}
              className="w-full bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg text-sm text-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-indigo-300 mb-1">Ask your Coach</label>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g., How should I pace my marathon in this heat?"
            className="w-full bg-slate-800 border border-slate-700 px-3 py-2 rounded-lg text-sm text-white focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg shadow-md transition-all disabled:opacity-50 text-sm"
        >
          {loading ? 'Analyzing Training Data...' : 'Get AI Coaching Recommendation'}
        </button>
      </form>

      {error && (
        <div className="mt-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-xs text-red-200">
          {error}
        </div>
      )}

      {response && (
        <div className="mt-6 p-4 bg-slate-800/80 border border-indigo-700/50 rounded-xl">
          <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">Coach Insight</p>
          <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">{response}</p>
        </div>
      )}
    </div>
  );
}
