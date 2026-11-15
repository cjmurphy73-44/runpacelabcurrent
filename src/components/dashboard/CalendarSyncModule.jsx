import React, { useState } from 'react';
import { buildTrainingCalendarICS } from '@/lib/trainingCalendarICS';

export default function CalendarSyncModule({ workouts = [], onSyncComplete }) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const exportFile = () => {
    setError('');
    setResult(null);
    let url;
    try {
      const exported = buildTrainingCalendarICS(workouts);
      if (!exported.exported) throw new Error('No scheduled sessions with valid dates to export.');
      const blob = new Blob([exported.content], { type: 'text/calendar;charset=utf-8' });
      url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'trainpacelab-training-plan.ics';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setResult({ exported: exported.exported, skipped: exported.skipped });
      onSyncComplete?.({ format: 'ics', count: exported.exported, skipped: exported.skipped });
    } catch (e) {
      setError(e?.message || 'Could not export your training plan.');
    } finally {
      if (url) URL.revokeObjectURL(url);
    }
  };

  return (
    <section className="rounded-lg border border-border bg-card p-4 sm:p-6 space-y-4" aria-label="Export training plan to calendar">
      <div className="space-y-1">
        <h2 className="font-heading font-bold text-lg">Add your plan to a calendar</h2>
        <p className="text-sm text-muted-foreground">Download a standard .ics file and import it into Apple Calendar, Google Calendar or Outlook. This is a one-time export, not live synchronization.</p>
      </div>
      <p className="text-sm text-muted-foreground">{workouts.length} planned sessions available. Sessions are all-day reminders because no start time has been specified.</p>
      <button type="button" onClick={exportFile} disabled={!workouts.length} className="min-h-[44px] w-full sm:w-auto rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Download calendar (.ics)</button>
      {result && <p role="status" className="text-sm text-muted-foreground">Downloaded {result.exported} sessions{result.skipped ? `; skipped ${result.skipped} sessions with invalid or missing dates` : ''}. Import the file into your calendar to add them. Future plan changes require another export.</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </section>
  );
}
