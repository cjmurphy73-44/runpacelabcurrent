import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useCoachInjurySignal } from '@/hooks/useCoachInjurySignal';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export default function CoachSignalNotice({ athleteId }) {
  const { user } = useAuth();
  return <CoachSignalNoticeContent key={`${user?.id}:${athleteId}`} athleteId={athleteId} />;
}

function CoachSignalNoticeContent({ athleteId }) {
  const signal = useCoachInjurySignal(athleteId);
  const [reviewing, setReviewing] = useState(false);
  const [saved, setSaved] = useState(false);
  if (signal.loading) return <p role="status" className="text-sm text-muted-foreground">Checking conversation guidance...</p>;
  if (signal.error) return <Alert><AlertTitle>Conversation guidance unavailable</AlertTitle><AlertDescription>Your saved plan is unchanged. <Button variant="outline" size="sm" onClick={() => signal.refresh()}>Retry</Button></AlertDescription></Alert>;
  if (signal.level === 'none') return saved ? <p role="status" className="text-sm text-muted-foreground">Review saved. Your training plan is unchanged.</p> : null;
  return (
    <Alert>
      <AlertTitle>Review recovery guidance</AlertTitle>
      <AlertDescription className="space-y-2">
        <p>{signal.summary}</p>
        <Button variant="outline" size="sm" onClick={() => setReviewing(!reviewing)} aria-expanded={reviewing}>Review guidance</Button>
        {reviewing && <div className="space-y-2">
          <p>This is an automatic conversation advisory, not a confirmed coach restriction. Mark the displayed guidance no longer relevant only if it no longer reflects your situation. This does not provide medical clearance or change a workout.</p>
          {signal.evidence.map((e, i) => <p key={i} className="text-xs">{e.date}: {e.snippet}</p>)}
          <Button size="sm" disabled={signal.saving} onClick={async () => {
            setSaved(false);
            try { await signal.resolve(); setSaved(true); setReviewing(false); } catch { /* error shown below */ }
          }}>{signal.saving ? 'Saving review...' : 'Mark no longer relevant'}</Button>
          <Button variant="ghost" size="sm" disabled={signal.saving} onClick={() => setReviewing(false)}>Keep guidance</Button>
          {signal.saveError && <p role="alert">Review could not be saved. Your plan is unchanged. Retry, or refresh if the conversation changed.</p>}
        </div>}
      </AlertDescription>
    </Alert>
  );
}
