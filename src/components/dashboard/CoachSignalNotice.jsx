import React, { useEffect, useId, useRef, useState } from 'react';
import { CheckCircle2, ChevronDown, MessageSquare } from 'lucide-react';
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
  const [selected, setSelected] = useState([]);
  const [saved, setSaved] = useState(null);
  const panelId = useId();
  const manageRef = useRef(null);
  const successRef = useRef(null);
  const keys = signal.evidence.map(entry => entry.review_key).filter(key => typeof key === 'string');
  const selectedKeys = selected.filter(key => keys.includes(key));
  const allSelected = keys.length > 0 && selectedKeys.length === keys.length;

  useEffect(() => {
    if (saved) (successRef.current || manageRef.current)?.focus();
  }, [saved]);

  if (signal.loading) return <p role="status" className="text-sm text-muted-foreground">Checking conversation guidance...</p>;
  if (signal.error) return <Alert><AlertTitle>Conversation guidance unavailable</AlertTitle><AlertDescription>Your saved plan is unchanged. <Button type="button" variant="outline" size="sm" onClick={() => signal.refresh()}>Retry</Button></AlertDescription></Alert>;
  if (signal.level === 'none') return saved ? (
    <div ref={successRef} tabIndex={-1} role="status" className="rounded-lg border border-primary/25 bg-primary/5 p-4 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <p className="flex items-center gap-2 font-medium"><CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" />Guidance cleared</p>
      <p className="mt-1 text-muted-foreground">{saved.count} {saved.count === 1 ? 'note' : 'notes'} cleared. Your conversation and training plan are unchanged. New guidance will still appear.</p>
    </div>
  ) : null;

  return (
    <Alert role="region" aria-label="Coach guidance" className="border-primary/25 bg-primary/5 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <AlertTitle className="flex items-center gap-2 text-base"><MessageSquare className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />Coach guidance</AlertTitle>
          <p className="text-xs text-muted-foreground">Conversation advisory · {signal.evidence.length} {signal.evidence.length === 1 ? 'note' : 'notes'} to review</p>
        </div>
        <Button type="button" ref={manageRef} variant="outline" size="sm" className="min-h-[44px] w-full shrink-0 gap-2 sm:w-auto" disabled={signal.saving} onClick={() => setReviewing(!reviewing)} aria-expanded={reviewing} aria-controls={panelId}>
          Manage guidance <ChevronDown className={`h-4 w-4 transition-transform motion-reduce:transition-none ${reviewing ? 'rotate-180' : ''}`} aria-hidden="true" />
        </Button>
      </div>
      <AlertDescription className="mt-3 space-y-3">
        <p>{signal.summary}</p>
        {saved && <p role="status" className="text-primary">{saved.count} {saved.count === 1 ? 'note' : 'notes'} cleared. Remaining guidance is shown below.</p>}
        {reviewing && <div id={panelId} className="space-y-3 border-t border-primary/15 pt-3">
          <fieldset disabled={signal.saving} className="min-w-0 space-y-2">
            <legend className="mb-2 font-medium">Which guidance no longer applies?</legend>
            <p className="pb-1 text-xs text-muted-foreground">Clear old conversation notices individually. This does not change a workout, delete a message or remove a confirmed coach restriction.</p>
            {signal.evidence.map((entry, index) => <label key={entry.review_key || index} className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-lg border border-border bg-background p-3 text-sm">
              <input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-primary" disabled={typeof entry.review_key !== 'string'} checked={selectedKeys.includes(entry.review_key)} onChange={event => setSelected(current => event.target.checked ? [...current, entry.review_key] : current.filter(key => key !== entry.review_key))} />
              <span className="min-w-0 break-words"><time dateTime={entry.date} className="mb-1 block text-xs text-muted-foreground">{new Date(entry.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</time>{entry.snippet}</span>
            </label>)}
          </fieldset>
          <Button type="button" variant="ghost" size="sm" className="min-h-[44px]" disabled={signal.saving || keys.length === 0} onClick={() => setSelected(allSelected ? [] : keys)}>{allSelected ? 'Deselect all shown' : 'Select all shown'}</Button>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" className="min-h-[44px] w-full sm:w-auto" disabled={signal.saving || selectedKeys.length === 0} onClick={async () => {
              const count = selectedKeys.length;
              setSaved(null);
              try {
                await signal.resolve(selectedKeys);
                setSaved({ count }); setSelected([]); setReviewing(false);
              } catch { /* Keep selections and show the server-confirmed failure below. */ }
            }}>{signal.saving ? 'Clearing guidance...' : `Clear selected guidance (${selectedKeys.length})`}</Button>
            <Button type="button" variant="ghost" className="min-h-[44px]" disabled={signal.saving} onClick={() => { setSelected([]); setReviewing(false); }}>Keep guidance</Button>
          </div>
          {signal.saveError && <p role="alert" className="text-sm text-destructive">Guidance could not be cleared. Your plan is unchanged. Retry, or refresh if the conversation changed.</p>}
        </div>}
      </AlertDescription>
    </Alert>
  );
}
