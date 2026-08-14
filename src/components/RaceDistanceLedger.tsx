'use client';

import React, { useState, useEffect } from 'react';

interface Segment {
  segment: string;
  timeSeconds: number;
  formattedTime: string;
}

interface PersonalBestRecord {
  id: string;
  sportType: 'RUN' | 'CYCLE' | 'SWIM';
  distanceName: string;
  distanceMeters: number;
  formattedTime: string;
  dateAchieved: string;
  isAllTime: boolean;
  segments?: Segment[];
  notes?: string;
}

export default function RaceDistanceLedger() {
  const [pbs, setPbs] = useState<PersonalBestRecord[]>([]);
  const [selectedSport, setSelectedSport] = useState<'RUN' | 'CYCLE'>('RUN');
  const [loading, setLoading] = useState<boolean>(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Default mock records with correct sport mapping (50K is CYCLE)
  const defaultPbs: PersonalBestRecord[] = [
    { id: '1', sportType: 'RUN', distanceName: '800m', distanceMeters: 800, formattedTime: '4:16', dateAchieved: '2026-03-19', isAllTime: true, notes: 'Track Time Trial' },
    { id: '2', sportType: 'RUN', distanceName: '1K', distanceMeters: 1000, formattedTime: '5:36', dateAchieved: '2026-04-28', isAllTime: true },
    { id: '3', sportType: 'RUN', distanceName: '5K', distanceMeters: 5000, formattedTime: '19:26', dateAchieved: '2026-05-22', isAllTime: true, segments: [{ segment: 'Fastest 1K Split', timeSeconds: 220, formattedTime: '3:40' }, { segment: 'Fastest 3K Split', timeSeconds: 690, formattedTime: '11:30' }] },
    { id: '4', sportType: 'RUN', distanceName: '10K', distanceMeters: 10000, formattedTime: '40:02', dateAchieved: '2026-08-01', isAllTime: true, segments: [{ segment: 'Fastest 5K Split', timeSeconds: 1180, formattedTime: '19:40' }] },
    { id: '5', sportType: 'RUN', distanceName: '15K', distanceMeters: 15000, formattedTime: '29:07', dateAchieved: '2026-02-11', isAllTime: true },
    { id: '6', sportType: 'RUN', distanceName: 'Marathon', distanceMeters: 42195, formattedTime: '1:32:56', dateAchieved: '2026-06-19', isAllTime: true, segments: [{ segment: 'Fastest 10K Split', timeSeconds: 2500, formattedTime: '41:40' }, { segment: 'Halfway Split', timeSeconds: 2700, formattedTime: '45:00' }] },
    { id: '7', sportType: 'CYCLE', distanceName: '50K Ride', distanceMeters: 50000, formattedTime: '1:38:09', dateAchieved: '2026-07-03', isAllTime: true, notes: 'Cycling Gran Fondo Segment' },
  ];

  useEffect(() => {
    async function fetchPbs() {
      try {
        const res = await fetch('/api/pbs');
        const json = await res.json();
        if (json.success && json.data.length > 0) {
          setPbs(json.data);
        } else {
          setPbs(defaultPbs);
        }
      } catch (err) {
        setPbs(defaultPbs);
      } finally {
        setLoading(false);
      }
    }
    fetchPbs();
  }, []);

  const filteredPbs = pbs.filter((pb) => pb.sportType === selectedSport);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading Distance Ledger...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-2xl shadow-md border border-slate-200">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Race & Activity Ledger</h2>
          <p className="text-slate-600 text-sm">Personal records and deep segment splits categorized by discipline.</p>
        </div>

        {/* Sport Type Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setSelectedSport('RUN')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedSport === 'RUN' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🏃‍♂️ Running PBs
          </button>
          <button
            onClick={() => setSelectedSport('CYCLE')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedSport === 'CYCLE' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🚴‍♂️ Cycling Records
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {filteredPbs.length === 0 ? (
          <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            No records found for {selectedSport === 'RUN' ? 'Running' : 'Cycling'}.
          </div>
        ) : (
          filteredPbs.map((pb) => {
            const isExpanded = expandedId === pb.id;
            const hasSegments = pb.segments && pb.segments.length > 0;

            return (
              <div
                key={pb.id}
                className={`border rounded-xl transition-all ${
                  isExpanded ? 'border-blue-500 bg-blue-50/20 shadow-sm' : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div
                  onClick={() => hasSegments && toggleExpand(pb.id)}
                  className={`p-4 flex items-center justify-between ${hasSegments ? 'cursor-pointer' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl bg-slate-900 text-white flex flex-col items-center justify-center font-extrabold shadow-sm">
                      <span className="text-xs uppercase text-slate-400 tracking-wider">
                        {pb.sportType === 'CYCLE' ? 'Ride' : 'Dist'}
                      </span>
                      <span className="text-xs sm:text-sm text-center px-1 truncate">{pb.distanceName}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-2xl font-black text-slate-900">{pb.formattedTime}</h3>
                        {pb.isAllTime && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-xs font-bold">
                            All-Time PB
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Achieved on {new Date(pb.dateAchieved).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {pb.notes && ` • ${pb.notes}`}
                      </p>
                    </div>
                  </div>

                  {hasSegments && (
                    <div className="text-right flex items-center gap-2 text-sm font-semibold text-blue-600">
                      <span>{pb.segments?.length} Split{pb.segments?.length !== 1 ? 's' : ''}</span>
                      <span className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                    </div>
                  )}
                </div>

                {/* Expanded Segment Splits */}
                {isExpanded && hasSegments && (
                  <div className="px-4 pb-4 pt-2 border-t border-slate-100 bg-slate-50/50 rounded-b-xl space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Fastest Splits & Segments</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {pb.segments?.map((seg, idx) => (
                        <div key={idx} className="p-3 bg-white border border-slate-200 rounded-lg flex justify-between items-center">
                          <span className="text-sm font-medium text-slate-700">{seg.segment}</span>
                          <span className="text-sm font-extrabold text-blue-600">{seg.formattedTime}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
