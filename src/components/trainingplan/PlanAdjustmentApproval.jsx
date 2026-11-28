import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { useCoachInjurySignal } from '@/hooks/useCoachInjurySignal';

export default function PlanAdjustmentApproval({ planId, athleteId, onApplied }) {
  const [sessions, setSessions] = useState([]);
  const [selected, setSelected] = useState('');
  const [proposal, setProposal] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const guidance = useCoachInjurySignal(athleteId);
  const blocked = guidance.loading || Boolean(guidance.error) ||
    guidance.level === 'hold';
  useEffect(() => {
    let active = true;
    base44.entities.TrainingPlanSession.filter({
      athlete_id: athleteId, training_plan_id: planId,
    }, 'date', 40).then(rows => {
      if (!active) return;
      const today = new Date().toISOString().slice(0, 10);
      const upcoming = (Array.isArray(rows) ? rows : [])
        .filter(s => s.status === 'pending' && !s.completed_workout_id &&
          s.date >= today && s.athlete_id === athleteId && s.training_plan_id === planId)
        .sort((a, b) => a.date.localeCompare(b.date));
      setSessions(upcoming);
      setSelected(upcoming[0]?.id || '');
    }).catch(() => {
      if (active) setError('Your upcoming sessions could not be loaded.');
    });
    return () => { active = false; };
  }, [planId, athleteId]);
  const preview = async () => {
    if (!selected || blocked) return;
    setBusy(true); setError(''); setMessage(''); setProposal(null);
    try {
      const result = await base44.functions.invoke('athletePlanReview', {
        action: 'preview', session_id: selected,
      });
      const body = result.data;
      if (body?.state === 'review_available' && body.proposal?.session_id === selected)
        setProposal(body.proposal);
      else setMessage(body?.explanation || 'There is not enough reliable data to suggest a change.');
    } catch { setError('Could not verify your current training data. No changes were made.'); }
    finally { setBusy(false); }
  };
  const approve = async () => {
    if (!proposal || blocked) return;
    setBusy(true); setError('');
    try {
      const result = await base44.functions.invoke('athletePlanReview', {
        action: 'apply', session_id: proposal.session_id,
        confirm: 'APPLY_REVIEWED_REDUCTION',
        snapshot: proposal.snapshot,
        proposed_duration_minutes: proposal.proposed_duration_minutes,
      });
      if (result.data?.applied !== true) throw new Error('Unverified');
      setProposal(null);
      setMessage(result.data.already_applied ? 'Already applied.' :
        'Your approved session duration is updated.');
      onApplied?.();
    } catch {
      setProposal(null);
      setError('The plan or evidence may have changed. Review again before confirming.');
    } finally { setBusy(false); }
  };
  return <section aria-label="Athlete-approved training adjustments"
    className="space-y-3 rounded-lg border p-4">
    <h2 className="font-heading text-base font-semibold">Review a training adjustment</h2>
    <p className="text-sm text-muted-foreground">
      Review an optional evidence-based reduction. Nothing changes until you approve.
      This is not an injury assessment or training clearance.
    </p>
    {sessions.length > 0 && <label className="block space-y-2 text-sm">
      <span>Upcoming session</span>
      <select className="w-full rounded-md border bg-background p-2" value={selected}
        disabled={busy || blocked}
        onChange={e => { setSelected(e.target.value); setProposal(null); setMessage(''); }}>
        {sessions.map(s => <option key={s.id} value={s.id}>
          {s.date} · {s.sport} · {s.prescribed_duration_minutes} minutes
        </option>)}
      </select>
    </label>}
    <Button variant="outline" onClick={preview} disabled={!selected || busy || blocked}>
      {busy ? 'Checking your training…' : 'Review saved training evidence'}
    </Button>
    {proposal && <div className="space-y-3" role="group" aria-label="Proposed change">
      <p className="text-sm">{proposal.rationale}</p>
      <p className="text-sm font-medium">{proposal.date} · {proposal.sport}:
        {' '}{proposal.old_duration_minutes} → {proposal.proposed_duration_minutes} minutes.
        Intensity stays {proposal.intensity_zone || 'unchanged'}.</p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={approve} disabled={busy || blocked}>Approve this change</Button>
        <Button variant="outline" disabled={busy} onClick={() => setProposal(null)}>
          Keep original plan
        </Button>
      </div>
    </div>}
    {blocked && <p role="status" className="text-sm text-muted-foreground">
      Review is unavailable while your coaching guidance is loading, unavailable,
      or an active hold is present.
    </p>}
    {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </section>;
}
