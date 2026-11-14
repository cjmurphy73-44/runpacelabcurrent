import React, { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';

const dateOnly = (date) => date.toISOString().slice(0, 10);

export default function RestHistoryReview({ athleteId }) {
  const [days, setDays] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const refresh = useCallback(async () => {
    if (!athleteId) return;
    setBusy(true);
    setMessage('');
    try {
      const now = new Date();
      const yesterday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
      const start = new Date(yesterday.getTime() - 13 * 86400000);
      const response = await base44.functions.invoke('reviewRestDays', {
        athlete_id: athleteId, action: 'preview',
        start_date: dateOnly(start), end_date: dateOnly(yesterday),
      });
      if (!response.data?.success) throw new Error(response.data?.error || 'Unable to verify history');
      setDays(response.data.days || []);
    } catch (error) {
      setDays([]);
      setMessage(error?.response?.data?.error || error.message || 'History preview unavailable');
    } finally {
      setBusy(false);
    }
  }, [athleteId]);

  useEffect(() => { refresh(); }, [refresh]);

  const missing = days.filter((day) => day.status === 'unknown');
  return (
    <section className="rounded-lg border border-border bg-card p-4 sm:p-5 space-y-3" aria-label="Training history coverage">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold">Training history coverage</h3>
          <p className="text-xs text-muted-foreground">Review the last 14 completed days. A missing recording is not proof of rest.</p>
        </div>
        <Button size="sm" variant="outline" onClick={refresh} disabled={busy}>
          {busy ? 'Checking…' : 'Refresh history'}
        </Button>
      </div>
      {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
      {!busy && days.length > 0 && <p className="text-sm text-muted-foreground">
        {missing.length} unverified day{missing.length === 1 ? '' : 's'} · {days.filter((day) => day.status === 'recorded').length} recorded · {days.filter((day) => day.status === 'confirmed_rest').length} athlete-confirmed rest
      </p>}
      <p role="status" className="text-xs text-muted-foreground">Rest confirmation is temporarily disabled while workout-import concurrency safeguards are implemented. Missing days remain unverified.</p>
      <div className="max-h-80 overflow-y-auto divide-y divide-border">
        {days.map((day) => <div key={day.date} className="flex items-center justify-between gap-3 py-2 text-sm">
          <div>
            <span className="font-medium">{day.date}</span>
            <span className="ml-2 text-muted-foreground">
              {day.status === 'recorded' ? `Recorded (${day.session_count})`
                : day.status === 'confirmed_rest' ? 'Rest confirmed by athlete'
                : day.status === 'unknown' ? 'Unverified'
                : day.status === 'conflict' ? 'Rest/workout conflict' : 'Recording load incomplete'}
            </span>
          </div>
          {day.status === 'unknown' && <span className="text-xs text-muted-foreground">Review only</span>}
        </div>)}
      </div>
      <p className="text-xs text-muted-foreground">Sync success does not confirm that no activity occurred. If you trained on an unverified day, sync or upload the workout instead. Rest confirmations never trigger automatic plan changes.</p>
    </section>
  );
}
