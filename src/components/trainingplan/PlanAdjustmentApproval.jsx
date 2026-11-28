import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';

export default function PlanAdjustmentApproval({ planId, onApplied, disabled = false }) {
  const [proposal, setProposal] = useState(null);
  const [state, setState] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const preview = async () => {
    setBusy(true); setError(''); setProposal(null);
    try {
      const result = await base44.functions.invoke('approvedPlanAdjustment', { action: 'preview' });
      const data = result?.data;
      if (data?.state === 'proposal' && data.plan_id === planId) setProposal(data);
      else setState(data?.reason || 'No adjustment is supported by the available data.');
    } catch { setError('Training evidence could not be reviewed. No changes were made.'); }
    finally { setBusy(false); }
  };
  const approve = async () => {
    if (!proposal || disabled) return;
    setBusy(true); setError('');
    try {
      const result = await base44.functions.invoke('approvedPlanAdjustment', {
        action: 'apply', approved: true,
        plan_id: proposal.plan_id, session_id: proposal.session_id,
        original_duration_minutes: proposal.original_duration_minutes,
        proposed_duration_minutes: proposal.proposed_duration_minutes,
        intensity_zone: proposal.intensity_zone,
      });
      if (!['applied', 'already_applied'].includes(result?.data?.state))
        throw new Error('Adjustment was not confirmed.');
      setState(result.data.state === 'applied'
        ? 'Your approved session duration has been updated.'
        : 'This change was already applied.');
      setProposal(null);
      onApplied?.();
    } catch { setProposal(null); setError('Your plan may have changed. Nothing new was confirmed; review again.'); }
    finally { setBusy(false); }
  };
  return <section aria-label="Athlete-approved plan adjustments"
    className="space-y-3 rounded-lg border border-border p-4">
    <h2 className="font-heading font-semibold">Review a training adjustment</h2>
    <p className="text-sm text-muted-foreground">
      Your recorded training history may support an optional small schedule change.
      Nothing changes until you approve it. This does not assess injury or medical readiness.
    </p>
    <Button variant="outline" onClick={preview} disabled={busy || disabled}>
      {busy ? 'Reviewing evidence…' : 'Review training evidence'}
    </Button>
    {proposal && <div className="space-y-3" role="group" aria-label="Proposed change">
      <p className="text-sm">{proposal.explanation}</p>
      <p className="font-medium text-sm">
        {proposal.sport} on {proposal.session_date}: {proposal.original_duration_minutes}
        {' → '}{proposal.proposed_duration_minutes} minutes.
        Intensity stays {proposal.intensity_zone || 'unchanged'}.
      </p>
      <p className="text-xs text-muted-foreground">
        {proposal.evidence?.recent_workouts} recorded workouts this week,
        {' '}{proposal.evidence?.prior_workouts} in the preceding week.
        Missing data may change the comparison.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button disabled={busy || disabled} onClick={approve}>Approve this change</Button>
        <Button variant="outline" disabled={busy} onClick={() => setProposal(null)}>Keep original plan</Button>
      </div>
    </div>}
    {state && <p role="status" className="text-sm text-muted-foreground">{state}</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {disabled && <p role="status" className="text-xs text-muted-foreground">
      Training adjustments are unavailable while the coaching hold is active.
    </p>}
  </section>;
}
