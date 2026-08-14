'use client';

import React, { useState } from 'react';

interface WorkoutDay {
  day: string;
  date: string;
  type: 'Easy Aerobic' | 'Intervals' | 'Threshold' | 'Long Run' | 'Rest' | 'Cross-Train';
  distanceKm: number;
  targetPace: string;
  notes: string;
  color: string;
}

export default function TrainingCalendar() {
  const [selectedWeek, setSelectedWeek] = useState<'current' | 'next'>('current');

  const currentWeekWorkouts: WorkoutDay[] = [
    { day: 'Monday', date: 'Aug 10', type: 'Rest', distanceKm: 0, targetPace: '-', notes: 'Complete recovery & mobility work.', color: 'bg-slate-100 text-slate-700 border-slate-200' },
    { day: 'Tuesday', date: 'Aug 11', type: 'Intervals', distanceKm: 10, targetPace: '3:45 /km', notes: '6x 800m VO2 Max intervals with 90s jog rest.', color: 'bg-purple-50 text-purple-900 border-purple-200' },
    { day: 'Wednesday', date: 'Aug 12', type: 'Easy Aerobic', distanceKm: 12, targetPace: '4:50 /km', notes: 'Zone 2 conversational pace. Keep heart rate < 145 BPM.', color: 'bg-emerald-50 text-emerald-900 border-emerald-200' },
    { day: 'Thursday', date: 'Aug 13', type: 'Threshold', distanceKm: 14, targetPace: '4:12 /km', notes: 'Cruising interval: 20 min continuous threshold effort.', color: 'bg-blue-50 text-blue-900 border-blue-200' },
    { day: 'Friday', date: 'Aug 14', type: 'Rest', distanceKm: 0, targetPace: '-', notes: 'Stretch and hydrate. Heat advisory active.', color: 'bg-slate-100 text-slate-700 border-slate-200' },
    { day: 'Saturday', date: 'Aug 15', type: 'Long Run', distanceKm: 22, targetPace: '4:40 /km', notes: 'Progressive long run. Finish final 5km at marathon goal pace.', color: 'bg-amber-50 text-amber-900 border-amber-200' },
    { day: 'Sunday', date: 'Aug 16', type: 'Cross-Train', distanceKm: 25, targetPace: 'Cycling', notes: 'Easy recovery spin on bike (Zone 1-2).', color: 'bg-indigo-50 text-indigo-900 border-indigo-200' },
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-2xl shadow-sm border border-slate-200 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-bold uppercase tracking-wider">
            VDOT Periodized Plan
          </span>
          <h2 className="text-2xl font-black text-slate-900 mt-1">Training Schedule & Calendar</h2>
          <p className="text-slate-600 text-sm">Automated weekly mileage and physiological session distribution.</p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setSelectedWeek('current')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedWeek === 'current' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            This Week (Aug 10 - 16)
          </button>
          <button
            onClick={() => setSelectedWeek('next')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedWeek === 'next' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Next Week (Aug 17 - 23)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {currentWeekWorkouts.map((session, idx) => (
          <div
            key={idx}
            className={`p-4 rounded-xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all hover:shadow-sm ${session.color}`}
          >
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-white/80 border border-slate-200 flex flex-col items-center justify-center font-extrabold shadow-xs">
                <span className="text-[10px] uppercase text-slate-500 tracking-wider">{session.day}</span>
                <span className="text-xs text-slate-800">{session.date}</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">{session.type}</h3>
                  {session.distanceKm > 0 && (
                    <span className="px-2 py-0.5 bg-white/80 border border-slate-200 rounded text-xs font-semibold text-slate-700">
                      {session.distanceKm} km
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 mt-1">{session.notes}</p>
              </div>
            </div>

            <div className="text-right sm:text-right w-full sm:w-auto flex sm:flex-col justify-between items-center sm:items-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Target Pace</span>
              <span className="text-sm font-black text-slate-900">{session.targetPace}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
