import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const SYMPTOMS = [
  ['cramps', 'Cramps'], ['headache', 'Headache'], ['fatigue', 'Fatigue'],
  ['bloating', 'Bloating'], ['mood_change', 'Mood changes'],
  ['breast_tenderness', 'Breast tenderness'], ['sleep_disruption', 'Sleep disruption'],
];
const initialEntry = () => ({ date: new Date().toISOString().slice(0, 10), period_started: false, flow: 'none', symptoms: [], symptom_severity: 0 });

export default function PrivateHealthJournal() {
  const [status, setStatus] = useState('checking');
  const [enabled, setEnabled] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [entry, setEntry] = useState(initialEntry);
  const [rows, setRows] = useState([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const call = async (data) => {
    const response = await base44.functions.invoke('athleteHealthJournal', data);
    return response.data;
  };
  const refresh = async () => {
    const result = await call({ action: 'status' });
    setEnabled(result?.enabled === true);
    setStatus(result?.available === true ? 'available' : 'unavailable');
    if (result?.enabled === true) {
      const history = await call({ action: 'list' });
      setRows(history?.entries ?? []);
    } else setRows([]);
  };
  useEffect(() => {
    let active = true;
    call({ action: 'status' }).then(async result => {
      if (!active) return;
      setEnabled(result?.enabled === true);
      setStatus(result?.available ? 'available' : 'unavailable');
      if (result?.enabled === true) {
        const history = await call({ action: 'list' });
        if (active) setRows(history?.entries ?? []);
      }
    }).catch(() => { if (active) setStatus('unavailable'); });
    return () => { active = false; };
  }, []);

  const run = async (action) => {
    setBusy(true);
    setMessage('');
    try {
      if (action === 'enable') await call({ action, acknowledged: true });
      if (action === 'save') await call({ action, entry });
      if (action === 'erase_all') {
        if (!window.confirm('Permanently erase every entry in your private health journal?')) return;
        await call({ action, confirm: 'DELETE' });
      }
      await refresh();
      setMessage(action === 'save' ? 'Entry saved privately.' : action === 'erase_all' ? 'Journal erased.' : 'Journal enabled.');
    } catch {
      setMessage('Could not complete the request. Your previous entries were not intentionally changed.');
    } finally { setBusy(false); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Optional menstrual health journal</CardTitle>
        <p className="text-sm text-muted-foreground">Log your own symptoms alongside training. Entries are kept outside coach and AI features. Authorized administrators may access them for support and operations. No automatic cycle-phase prescriptions.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {status === 'checking' && <p role="status" className="text-sm">Checking journal availability…</p>}
        {status === 'unavailable' && <p className="text-sm text-muted-foreground">Private journal is not yet enabled in this environment. Your standard recovery tracking remains available.</p>}
        {status === 'available' && !enabled && (
          <div className="space-y-3">
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={acknowledged} onChange={e => setAcknowledged(e.target.checked)} className="mt-1" />
              I choose to store sensitive menstrual and symptom information privately. This is optional, may be deleted, and is not required for readiness or plans.
            </label>
            <Button disabled={busy || !acknowledged} onClick={() => run('enable')}>Enable private journal</Button>
          </div>
        )}
        {status === 'available' && enabled && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-medium">Date
                <input aria-label="Journal date" type="date" max={new Date().toISOString().slice(0, 10)} value={entry.date} onChange={e => setEntry(p => ({ ...p, date: e.target.value }))} className="mt-1 block min-h-11 w-full rounded-md border border-input bg-card px-3 text-foreground" />
              </label>
              <label className="text-sm font-medium">Bleeding
                <select value={entry.flow} onChange={e => setEntry(p => ({ ...p, flow: e.target.value }))} className="mt-1 block min-h-11 w-full rounded-md border border-input bg-card px-3 text-foreground">
                  <option value="none">None</option><option value="spotting">Spotting</option>
                  <option value="light">Light</option><option value="medium">Medium</option><option value="heavy">Heavy</option>
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input type="checkbox" checked={entry.period_started} onChange={e => setEntry(p => ({ ...p, period_started: e.target.checked }))} />
                Period started on this date
              </label>
            </div>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Symptoms (optional)</legend>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {SYMPTOMS.map(([value, label]) => <label key={value} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={entry.symptoms.includes(value)}
                    onChange={e => setEntry(p => ({ ...p, symptoms: e.target.checked ? [...p.symptoms, value] : p.symptoms.filter(s => s !== value) }))} />
                  {label}
                </label>)}
              </div>
            </fieldset>
            <label className="block text-sm font-medium">Symptom severity (0–4)
              <input type="range" min="0" max="4" value={entry.symptom_severity} onChange={e => setEntry(p => ({ ...p, symptom_severity: Number(e.target.value) }))} className="mt-2 w-full" />
              <span className="ml-2 font-normal text-muted-foreground">{entry.symptom_severity}/4</span>
            </label>
            <div className="flex flex-wrap gap-3">
              <Button disabled={busy} onClick={() => run('save')}>Save private entry</Button>
              <Button variant="outline" disabled={busy} onClick={() => run('erase_all')}>Erase journal and opt out</Button>
            </div>
            {rows.length > 0 && <div className="space-y-2">
              <h3 className="text-sm font-semibold">Recent entries</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {rows.slice(0, 10).map(r => <li key={r.date}>{r.date}: {r.flow || 'Not recorded'}; {r.symptoms?.length ? r.symptoms.join(', ').replaceAll('_', ' ') : 'No symptoms logged'}</li>)}
              </ul>
            </div>}
          </div>
        )}
        {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
        <p className="text-xs text-muted-foreground">Cycle or symptom logs do not determine fertility, predict ovulation, diagnose conditions, or automatically alter training. Seek qualified medical advice for concerning symptoms.</p>
      </CardContent>
    </Card>
  );
}
