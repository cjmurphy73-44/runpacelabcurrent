import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { athleteHistorySignals } from '@/lib/athleteHistorySignals.mjs';

export default function AthleteHistoryInsights({ workouts = [] }) {
  const signals = useMemo(() => athleteHistorySignals(workouts), [workouts]);
  if (signals.status !== 'available') return null;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Your training context</CardTitle>
        <p className="text-sm text-muted-foreground">A factual snapshot of your saved sessions, not an automated training prescription.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div><dt className="text-xs text-muted-foreground">Last 7 days</dt><dd className="font-heading text-xl font-bold">{signals.currentSessions} workouts</dd></div>
          <div><dt className="text-xs text-muted-foreground">Training time</dt><dd className="font-heading text-xl font-bold">{signals.recentMinutes} min</dd></div>
          <div><dt className="text-xs text-muted-foreground">Measured streams</dt><dd className="font-heading text-xl font-bold">{signals.measured}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Summary or unknown</dt><dd className="font-heading text-xl font-bold">{signals.estimated + signals.unknown}</dd></div>
        </dl>
        {signals.comparison !== 'insufficient_history' && (
          <p className="text-sm text-muted-foreground">
            Compared with the previous 7 days, saved training time was {signals.comparison === 'more_time' ? 'higher' : signals.comparison === 'less_time' ? 'lower' : 'unchanged'}.
            {' '}That alone does not establish whether you should increase or decrease training.
          </p>
        )}
        <p className="text-xs text-muted-foreground">Based on recent saved workouts. Missing device sessions can change this picture; summary-only data may not support detailed zone analysis.</p>
      </CardContent>
    </Card>
  );
}
