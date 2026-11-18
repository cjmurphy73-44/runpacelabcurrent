import React, { useEffect, useState } from 'react';
import { useAthlete } from '@/hooks/useAthlete';
import { base44 } from '@/api/base44Client';
import PageShell from '@/components/layout/PageShell';
import WorkoutReviewExperience from '@/components/workout/WorkoutReviewExperience';

export default function WorkoutReview() {
  const { athlete, loading, error } = useAthlete();
  const [workouts, setWorkouts] = useState([]);
  const [selected, setSelected] = useState('');
  const [state, setState] = useState('loading');
  useEffect(() => {
    if (loading) return;
    if (!athlete?.id) { setState('empty'); return; }
    let active = true;
    setState('loading');
    base44.entities.WorkoutSession.filter({ athlete_id: athlete.id }, '-date', 100)
      .then(rows => { if (!active) return; const list = Array.isArray(rows) ? rows : rows?.data || []; setWorkouts(list); setSelected(list[0]?.id || ''); setState('ready'); })
      .catch(() => { if (active) setState('error'); });
    return () => { active = false; };
  }, [athlete?.id, loading]);
  const workout = workouts.find(w => w.id === selected);
  return <PageShell title="Workout review" description="Measured recordings, provenance and training insights" maxWidth="max-w-5xl">
    {error || state === 'error' ? <div role="alert" className="rounded-xl border p-5">Workout history could not be loaded. Retry by reopening this page.</div>
      : state === 'loading' ? <p role="status" className="py-10 text-muted-foreground">Loading workouts…</p>
      : !workout ? <div className="rounded-xl border p-5 space-y-2"><h2 className="font-semibold">No workout to review</h2><p className="text-sm text-muted-foreground">Import or log a workout first.</p><a href="/import" className="underline text-primary">Open imports</a></div>
      : <div className="space-y-5">
        <label htmlFor="review-workout" className="block text-sm font-medium">Choose a workout</label>
        <select id="review-workout" className="w-full min-h-11 rounded-lg border border-input bg-background px-3 text-sm" value={selected} onChange={e => setSelected(e.target.value)}>
          {workouts.map(w => <option key={w.id} value={w.id}>{w.date} · {w.sport} · {Math.round(w.duration_minutes || 0)} min</option>)}
        </select>
        <WorkoutReviewExperience workout={workout} />
      </div>}
  </PageShell>;
}
