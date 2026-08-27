import React, { useState } from 'react';
import { useCoachingInsights } from '../hooks/useCoachingInsights';
import { Button } from '@/components/ui/button';
import { MapPin, RefreshCw, Info } from 'lucide-react';

export const IntelligenceHub: React.FC = () => {
  const { data, loading, error, refetchWeather, weatherRefreshing } = useCoachingInsights();

  if (loading) return <div className="p-6 text-slate-400">Loading your daily briefing...</div>;
  if (error) return <div className="p-6 text-red-500">Error loading coaching data.</div>;

  const readinessDisplay =
    typeof data?.readinessScore === 'number' ? (
      <div className="flex items-baseline gap-3">
        <div className="text-4xl font-bold text-blue-600">{data.readinessScore}</div>
        <div className="text-sm text-slate-500">
          / 100 · {data.readinessSource === 'logged' ? 'device-reported' : 'synthesized from your daily signals'}
        </div>
      </div>
    ) : (
      <div className="text-sm text-slate-600 bg-amber-50 border border-amber-200 rounded-md p-3 flex items-start gap-2">
        <Info className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
        <span>{data?.readinessExplanation || 'Readiness data unavailable.'}</span>
      </div>
    );

  const weatherDisplay = data?.weatherConditions ? (
    <div className="space-y-1.5 text-sm text-slate-700">
      <div className="flex gap-4 text-slate-500">
        <span>{data.weatherConditions.tempC}°C</span>
        <span>{data.weatherConditions.rh}% RH</span>
        <span>Dew {data.weatherConditions.dewPointC}°C</span>
        {data.weatherConditions.elevationM > 0 && (
          <span>{data.weatherConditions.elevationM}m elev</span>
        )}
      </div>
      {data.weatherConditions.pacePctSlowdown > 0 && (
        <div className="text-orange-600 font-medium">
          Slow easy pace ~{data.weatherConditions.pacePctSlowdown}% · target {data.weatherConditions.adjustedPace}
        </div>
      )}
    </div>
  ) : null;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <header>
        <h2 className="text-2xl font-bold text-slate-900">Intelligence Hub</h2>
        <p className="text-slate-600">Your daily physiological command center.</p>
      </header>

      {/* Readiness Score */}
      <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="font-semibold text-slate-900 mb-2">Readiness Score</h3>
        {readinessDisplay}
      </section>

      {/* Weather Adjustment */}
      <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-slate-900">Weather Adjustment</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={refetchWeather}
            disabled={weatherRefreshing}
            className="h-7 text-xs text-slate-500"
          >
            <RefreshCw className={weatherRefreshing ? 'w-3.5 h-3.5 animate-spin' : 'w-3.5 h-3.5'} /> Retry
          </Button>
        </div>
        <div>
          {data?.weatherAdvice && <p className="text-slate-700">{data.weatherAdvice}</p>}
          {weatherDisplay}
          {data?.weatherError && (
            <div className="mt-2 text-xs text-amber-600 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {data.weatherError}
            </div>
          )}
        </div>
      </section>

      {/* Coaching Brief */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-2">Coaching Brief</h3>
          <p className="text-slate-700">{data?.coachingFeedback || 'Awaiting workout analysis.'}</p>
        </div>
      </section>
    </div>
  );
};