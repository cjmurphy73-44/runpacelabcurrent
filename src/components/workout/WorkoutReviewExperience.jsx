import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { recordingPresentation, chartSeries } from '@/lib/workoutReviewPresentation';

const channels = [
  { key: 'heart_rate', title: 'Heart rate', unit: 'bpm' },
  { key: 'pace', title: 'Pace', unit: 'min/km' },
  { key: 'power', title: 'Power', unit: 'W' },
];

export default function WorkoutReviewExperience({ workout }) {
  const [channel, setChannel] = useState('heart_rate');
  const recording = useMemo(() => recordingPresentation(workout), [workout]);
  const active = channels.find(c => c.key === channel);
  const series = useMemo(() => chartSeries(recording.points, channel), [recording.points, channel]);
  const hasChannel = series.some(p => p.value !== null);
  const load = workout?.session_trimp > 0 ? { value: workout.session_trimp, label: 'TRIMP' }
    : workout?.session_tss > 0 ? { value: workout.session_tss, label: 'rTSS' } : null;
  return (
    <section aria-label="Workout review" className="min-w-0 space-y-5">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Workout review</p>
        <h2 className="text-2xl font-semibold tracking-tight capitalize">{workout?.sport || 'Workout'} · {workout?.date || 'Undated'}</h2>
        <p className="text-sm text-muted-foreground">Measured data and estimates are shown separately.</p>
      </header>
      <div role="status" className="rounded-xl border border-border bg-card p-4 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">{recording.label}</h3>
          <span className="text-xs text-muted-foreground">{recording.count.toLocaleString()} stored samples</span>
        </div>
        {recording.coverage !== null && <div className="space-y-1">
          <div className="h-2 rounded-full bg-secondary overflow-hidden" role="progressbar" aria-label="Stored recording time coverage" aria-valuenow={recording.coverage} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full bg-primary" style={{ width: `${recording.coverage}%` }} />
          </div>
          <p className="text-xs text-muted-foreground">Stored time span covers approximately {recording.coverage}% of reported duration. This is not proof that the original FIT file is archived.</p>
        </div>}
        {recording.state !== 'recorded' && <p className="text-sm">Full-session stream analysis is unavailable. Summary values may still be estimates.</p>}
        {recording.state !== 'recorded' && <Link to="/import" className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline underline-offset-4">Import an original FIT or TCX recording</Link>}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['Duration', workout?.duration_minutes ? `${Math.round(workout.duration_minutes)} min` : '—'],
          ['Distance', Number.isFinite(workout?.distance_km) ? `${workout.distance_km.toFixed(2)} km` : '—'],
          ['Average HR', workout?.avg_hr ? `${Math.round(workout.avg_hr)} bpm` : '—'],
          [load?.label || 'Training load', load ? String(Math.round(load.value)) : '—'],
        ].map(([label, value]) => <div key={label} className="min-w-0 rounded-xl border bg-card p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-lg font-semibold tabular-nums">{value}</p></div>)}
      </div>
      <section className="rounded-xl border bg-card p-3 sm:p-5 space-y-4" aria-label="Recording timeline">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">Recording timeline</h3>
          <span className="text-xs text-muted-foreground">Stored measurements only</span>
        </div>
        <div role="group" aria-label="Chart metric" className="grid grid-cols-3 gap-2">
          {channels.map(c => <button key={c.key} type="button" aria-pressed={channel === c.key} onClick={() => setChannel(c.key)} className={`min-h-11 rounded-lg border px-2 py-2 text-xs sm:text-sm ${channel === c.key ? 'border-primary bg-primary/10 font-semibold' : 'border-border'}`}>{c.title}</button>)}
        </div>
        {recording.state === 'summary' ? <div className="flex min-h-48 items-center justify-center rounded-lg bg-secondary/40 p-5 text-center text-sm text-muted-foreground">No verified measured stream to chart.</div>
          : !hasChannel ? <div className="flex min-h-48 items-center justify-center rounded-lg bg-secondary/40 p-5 text-center text-sm text-muted-foreground">No measured {active.title.toLowerCase()} channel in this recording.</div>
          : <div className="h-64 w-full min-w-0" role="img" aria-label={`${active.title} measurements over stored recording time`}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 8, right: 8, left: -24, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="minute" tick={{ fontSize: 11 }} tickFormatter={v => `${v}m`} minTickGap={25} />
                <YAxis tick={{ fontSize: 11 }} domain={['auto','auto']} />
                <Tooltip formatter={v => [v, active.unit]} labelFormatter={v => `${v} min`} />
                <Line type="monotone" dataKey="value" stroke="currentColor" strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>}
        <p className="text-xs text-muted-foreground">Chart points are reduced for display only. No physiological calculations use this preview.</p>
      </section>
      <section className="rounded-xl border bg-card p-4 space-y-2" aria-label="Training interpretation">
        <h3 className="font-semibold">Training interpretation</h3>
        <p className="text-sm">{workout?.load_source === 'stream' ? 'Training load was computed from a measured stream at ingest.' : workout?.load_source === 'summary' ? 'Training load uses summary data and is an estimate.' : 'Training-load provenance is not confirmed.'}</p>
        <p className="text-sm">{workout?.zone_method === 'stream' ? 'Heart-rate zones were calculated from measured samples.' : workout?.zone_method === 'laps' ? 'Heart-rate zones were derived from lap data.' : 'Measured heart-rate zone distribution is unavailable.'}</p>
        {recording.state === 'partial' && <p className="text-sm text-muted-foreground">The timeline shows the stored segment only, not the entire workout.</p>}
      </section>
    </section>
  );
}
