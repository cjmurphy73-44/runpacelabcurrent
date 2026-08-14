'use client';

import React, { useState } from 'react';

export default function SettingsPage() {
  const [name, setName] = useState('Connor Murphy');
  const [email, setEmail] = useState('connor@example.com');
  const [defaultVdot, setDefaultVdot] = useState(52.4);
  const [maxHr, setMaxHr] = useState(190);
  const [unitSystem, setUnitSystem] = useState('metric');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <main className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Athlete Settings</h1>
          <p className="text-slate-600 text-sm">Configure your physiological baseline parameters and unit preferences.</p>
        </div>

        <form onSubmit={handleSave} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Athlete Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Default VDOT Score</label>
              <input
                type="number"
                step="0.1"
                value={defaultVdot}
                onChange={(e) => setDefaultVdot(parseFloat(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">Used as baseline for quick AI and pace calculations.</span>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Max Heart Rate (BPM)</label>
              <input
                type="number"
                value={maxHr}
                onChange={(e) => setMaxHr(parseInt(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">Used for Karvonen and percentage HR zones.</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Unit System</label>
            <div className="flex gap-4">
              <label className={`flex-1 p-3 rounded-xl border-2 cursor-pointer flex items-center justify-center gap-2 font-semibold text-sm transition-all ${
                unitSystem === 'metric' ? 'border-blue-600 bg-blue-50/50 text-blue-900' : 'border-slate-200 text-slate-600'
              }`}>
                <input
                  type="radio"
                  name="units"
                  checked={unitSystem === 'metric'}
                  onChange={() => setUnitSystem('metric')}
                  className="hidden"
                />
                Kilometers (km / min/km)
              </label>
              <label className={`flex-1 p-3 rounded-xl border-2 cursor-pointer flex items-center justify-center gap-2 font-semibold text-sm transition-all ${
                unitSystem === 'imperial' ? 'border-blue-600 bg-blue-50/50 text-blue-900' : 'border-slate-200 text-slate-600'
              }`}>
                <input
                  type="radio"
                  name="units"
                  checked={unitSystem === 'imperial'}
                  onChange={() => setUnitSystem('imperial')}
                  className="hidden"
                />
                Miles (mi / min/mi)
              </label>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-slate-100">
            {saved ? (
              <span className="text-xs font-bold text-emerald-600 animate-fade-in">✓ Settings saved successfully!</span>
            ) : (
              <span className="text-xs text-slate-500">Changes apply instantly across all calculators.</span>
            )}
            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-md transition-all text-sm"
            >
              Save Preferences
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
