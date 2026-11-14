import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const EMPTY = { race_date: '', distance_m: '5000', elapsed_seconds: '', sport: 'running', event_name: '' };

export default function RaceResultReview() {
  const [form, setForm] = useState(EMPTY);
  const [records, setRecords] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const refresh = async () => {
    setLoading(true);
    try {
      const user = await base44.auth.me();
      const athleteId = user?.data?.athlete_profile_id || user?.athlete_profile_id;
      if (!athleteId) { setRecords([]); setError('Finish athlete onboarding before saving a race result.'); return; }
      const rows = await base44.entities.RaceResult.filter({ athlete_id: athleteId }, '-race_date', 100);
      setRecords((rows || []).filter(row => row.created_by_id === user.id && row.evidence_status === 'self_reported'));
      setError('');
    } catch {
      setRecords([]);
      setError('Race history could not be loaded. No saved results are assumed.');
    } finally { setLoading(false); }
  };
  useEffect(() => { refresh(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    if (busy) return;
    const distance_m = Number(form.distance_m);
    const elapsed_seconds = Number(form.elapsed_seconds);
    if (!form.race_date || !Number.isFinite(distance_m) || distance_m < 1200 ||
        !Number.isFinite(elapsed_seconds) || elapsed_seconds < 180) {
      setError('Enter a real race date, distance of at least 1200 m and time of at least 3 minutes.');
      return;
    }
    setBusy(true);
    try {
      const payload = { ...form, distance_m, elapsed_seconds,
        ...(editingId ? { action: 'correct', id: editingId } : {}) };
      const response = await base44.functions.invoke('submitRaceResult', payload);
      const data = response?.data ?? response;
      if (data?.error) throw new Error(data.error);
      setNotice(editingId ? 'Race result corrected. Still athlete-reported.' : 'Saved as athlete-reported, not independently verified.');
      setEditingId(null);
      setForm(EMPTY);
      await refresh();
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Could not save race result. Check your connection and review duplicates.');
    } finally { setBusy(false); }
  };

  const startEdit = (r) => {
    setEditingId(r.id);
    setForm({ race_date: r.race_date, distance_m: String(r.distance_m),
      elapsed_seconds: String(r.elapsed_seconds), sport: 'running', event_name: r.event_name || '' });
    setNotice('');
    setError('');
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>My race results</CardTitle>
        <CardDescription>Enter a completed running race to estimate VDOT. These are athlete-reported results, not verified by a wearable or event organizer.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label htmlFor="race-date">Race date</Label><Input id="race-date" type="date" required value={form.race_date}
              onChange={e => setForm(f => ({ ...f, race_date: e.target.value }))} /></div>
            <div><Label htmlFor="race-name">Event name (optional)</Label><Input id="race-name" maxLength={120} value={form.event_name}
              onChange={e => setForm(f => ({ ...f, event_name: e.target.value }))} /></div>
            <div><Label htmlFor="race-distance">Distance (metres)</Label><Input id="race-distance" type="number" min="1200" step="0.1" required value={form.distance_m}
              onChange={e => setForm(f => ({ ...f, distance_m: e.target.value }))} /></div>
            <div><Label htmlFor="race-seconds">Finish time (seconds)</Label><Input id="race-seconds" type="number" min="180" step="1" required value={form.elapsed_seconds}
              onChange={e => setForm(f => ({ ...f, elapsed_seconds: e.target.value }))} /></div>
          </div>
          <p className="text-xs text-muted-foreground">Example: 20:00 is 1200 seconds. Correct a saved result rather than adding the same race twice.</p>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          {notice && <p role="status" className="text-sm text-muted-foreground">{notice}</p>}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={busy}>{busy ? 'Saving…' : editingId ? 'Save correction' : 'Save race result'}</Button>
            {editingId && <Button type="button" variant="secondary" onClick={() => { setEditingId(null); setForm(EMPTY); }}>Cancel edit</Button>}
          </div>
        </form>
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Review saved results</h3>
          {loading ? <p className="text-sm text-muted-foreground">Loading results…</p> :
            records.length === 0 ? <p className="text-sm text-muted-foreground">No athlete-reported race results loaded.</p> :
            records.map(r => <div key={r.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-md border p-3">
              <div className="text-sm"><strong>{r.race_date}</strong> · {r.distance_m} m · {r.elapsed_seconds} s
                <p className="text-xs text-muted-foreground">Self-reported, unverified {r.event_name ? '· ' + r.event_name : ''}</p></div>
              <Button type="button" size="sm" variant="outline" onClick={() => startEdit(r)}>Correct</Button>
            </div>)}
        </div>
      </CardContent>
    </Card>
  );
}
