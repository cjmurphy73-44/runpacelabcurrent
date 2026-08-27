import React from 'react';
import { useCoachingInsights } from '../hooks/useCoachingInsights';

export const IntelligenceHub: React.FC = () => {
  const { data, loading, error } = useCoachingInsights();

  if (loading) return <div className="p-6 text-slate-400">Loading your daily briefing...</div>;
  if (error) return <div className="p-6 text-red-500">Error loading coaching data.</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <header>
        <h2 className="text-2xl font-bold text-slate-900">Intelligence Hub</h2>
        <p className="text-slate-600">Your daily physiological command center.</p>
      </header>
      <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="font-semibold text-slate-900 mb-2">Readiness Score</h3>
        <div className="text-4xl font-bold text-blue-600">{data?.readinessScore || 'N/A'}</div>
      </section>
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-2">Weather Adjustment</h3>
          <p className="text-slate-700">{data?.weatherAdvice || 'No data available.'}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-2">Coaching Brief</h3>
          <p className="text-slate-700">{data?.coachingFeedback || 'Awaiting workout analysis.'}</p>
        </div>
      </section>
    </div>
  );
};
