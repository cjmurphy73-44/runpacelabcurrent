import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';

// Explicit, one-session approval. A preview never mutates the plan.
// The backend is authoritative for ownership, snapshot checks and paid gates.
export default function AthletePlanApprovalCard({ athleteId, planId, holdActive }) {
  const [sessions, setSessions] = useState([]);
  const [selected, setSelected] = useState('');
  const [percent, setPercent] = useState(10);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    let live = true;
    base44.entities.TrainingPlanSession.filter({
      athlete_id: athleteId, training_plan_id: planId, status: 'pending',
    }, 'date', 50).then(rows => {
      if (!live) return;
      const today = new Date().toISOString().slice(0, 10);
      const upcoming = (rows || []).filter(s => s.date >= today &&
        s.date <= new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10))
        .sort((a,b) => a.date.localeCompare(b.date));
      setSessions(upcoming);
      setSelected(upcoming[0]?.id || '');
    }).catch(() => { if (live) setMessage('Upcoming sessions could not be loaded.'); });
    return () => { live = false; };
  }, [athleteId, planId]);
  const review = async () => {
    setBusy(true); setPreview(null); setMessage('');
    try {
      const result = await base44.functions.invoke('athletePlanApproval', {
        action: 'preview', session_id: selected, reduction_percent: percent,
      });
      if (result.data?.state !== 'preview_only') throw new Error('Unavailable');
      setPreview(result.data);
    } catch {
      setMessage('This session is not eligible for a plan change.');
    } finally { setBusy(false); }
  };
  const apply = async () => {
    if (!preview?.approval_available || !preview.expected_snapshot || holdActive) return;
    setBusy(true); setMessage('');
    try {
      const result = await base44.functions.invoke('athletePlanApproval', {
        action: 'approve', session_id: preview.session_id, reduction_percent: percent,
        expected_snapshot: preview.expected_snapshot, confirm: 'APPLY',
      });
      if (result.data?.state !== 'applied') throw new Error('Not verified');
      setMessage('Your approved session reduction was saved and verified. Reload the plan to see the update.');
      setPreview(null);
    } catch {
      setPreview(null);
      setMessage('The session was not confirmed. It may have changed; review again.');
    } finally { setBusy(false); }
  };
  return <section className="rounded-lg border border-border bg-card p-4 space-y-3" aria-label="Review a session adjustment">
    <div className="space-y-1">
      <h3 className="font-semibold">Review a training-session adjustment</h3>
      <p className="text-sm text-muted-foreground">
        Choose a conservative reduction for one upcoming session. This is your choice, not an automatic
        training prescription. The original plan stays unchanged until an approval is verified.
      </p>
    </div>
    {sessions.length === 0 ? <p className="text-sm text-muted-foreground">No eligible upcoming sessions.</p> : <>
      <label className="block text-sm">Session
        <select className="mt-1 w-full rounded border border-input bg-background p-2 text-foreground"
          value={selected} onChange={e => { setSelected(e.target.value); setPreview(null); }}>
          {sessions.map(s => <option key={s.id} value={s.id}>{s.date} · {s.sport} · {s.prescribed_duration_minutes} min</option>)}
        </select>
      </label>
      <label className="block text-sm">Requested reduction
        <select className="mt-1 w-full rounded border border-input bg-background p-2 text-foreground"
          value={percent} onChange={e => { setPercent(Number(e.target.value)); setPreview(null); }}>
          <option value={10}>10% shorter</option>
          <option value={20}>20% shorter</option>
        </select>
      </label>
      <Button variant="outline" disabled={busy || !selected} onClick={review}>
        {busy ? 'Checking…' : 'Preview change'}
      </Button>
      {preview && <div className="rounded border border-border p-3 space-y-2 text-sm">
        <p>{preview.date}: {preview.previous_duration_minutes} minutes → <strong>{preview.proposed_duration_minutes} minutes</strong>.</p>
        <p className="text-muted-foreground">{preview.evidence_note}</p>
        {!preview.approval_available && <p role="status" className="text-muted-foreground">
          Applying changes is not enabled in this private preview. You can review proposals without changing your plan.
        </p>}
        <Button disabled={busy || holdActive || !preview.approval_available} onClick={apply}>
          Approve this single-session change
        </Button>
        {holdActive && <p role="status" className="text-muted-foreground">Plan changes are blocked while the coaching hold is active.</p>}
      </div>}
    </>}
    {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
  </section>;
}
