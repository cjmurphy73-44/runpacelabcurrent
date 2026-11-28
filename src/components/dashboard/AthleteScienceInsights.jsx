import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

function MatchedEffort({ sport, data }) {
  const state = data?.state;
  if (state !== 'descriptive_only') {
    return <p className="text-sm text-muted-foreground">
      {sport}: Insufficient comparable recordings to describe a repeatable change.
    </p>;
  }
  const unit = data.metric === 'average_power_watts' ? 'average cycling power' : 'average running speed';
  const change = Number(data.relative_change_percent);
  return <p className="text-sm text-foreground">
    {sport}: {unit} was {Number.isFinite(change) ? Math.abs(change).toFixed(1) : '—'}%
    {Number.isFinite(change) ? (change >= 0 ? ' higher' : ' lower') : ' different'} across comparable sessions
    ({data.older?.distinct_days ?? data.older?.sessions ?? 0} earlier dates,
    {' '}{data.recent?.distinct_days ?? data.recent?.sessions ?? 0} recent dates).
    This is an observation, not proof of adaptation.
  </p>;
}

export default function AthleteScienceInsights() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const analyze = async () => {
    setLoading(true); setError('');
    try {
      const response = await base44.functions.invoke('athleteUnderstanding', {});
      if (response.data?.state !== 'observational_only') throw new Error('Data unavailable');
      setData(response.data);
    } catch {
      setData(null);
      setError('Athlete context is currently unavailable. Check your workout sync and try again.');
    } finally { setLoading(false); }
  };
  const load = data?.history?.load_by_unit;
  const coverage = data?.history?.session_coverage;
  return <Card>
    <CardHeader className="pb-3">
      <CardTitle className="text-base">Your training evidence</CardTitle>
      <p className="text-sm text-muted-foreground">
        On-demand private analysis of saved sessions and recovery readings. No automatic training changes.
      </p>
    </CardHeader>
    <CardContent className="space-y-3">
      <Button onClick={analyze} disabled={loading} variant="outline">
        {loading ? 'Reviewing your history…' : data ? 'Refresh training evidence' : 'Analyze my training'}
      </Button>
      {error && <p role="status" className="text-sm text-muted-foreground">{error}</p>}
      {data && <>
        <p className="text-xs text-muted-foreground">
          Reference date: {data.reference_date} (UTC). {coverage?.days_with_saved_workouts ?? 0}
          {' '}of {coverage?.recent_days ?? 28} calendar days contain saved workouts;
          blank days are not assumed to be rest.
        </p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="block text-muted-foreground">TRIMP</span>
            <strong>{load?.trimp?.sessions ?? 0} sessions</strong></div>
          <div><span className="block text-muted-foreground">TSS</span>
            <strong>{load?.tss?.sessions ?? 0} sessions</strong></div>
        </div>
        {data.coach_evidence?.state === "observational_only" && <div className="space-y-2" aria-label="Evidence for individual coaching">
          <h4 className="text-sm font-semibold">What your training evidence says</h4>
          {data.coach_evidence.findings.map((finding, i) => <p key={finding.source + i} className="text-sm text-foreground">{finding.text}</p>)}
          <p className="text-xs text-muted-foreground">These observations do not automatically change your plan or establish injury risk.</p>
        </div>}
        <div className="space-y-2">
          <MatchedEffort sport="Running" data={data.matched_efforts?.running} />
          <MatchedEffort sport="Cycling" data={data.matched_efforts?.cycling} />
        </div>
        <p className="text-xs text-muted-foreground">
          Measurements, training-load methods and recovery baselines have different evidence quality.
          No injury risk, diagnosis, menstrual phase or training clearance is inferred.
        </p>
      </>}
    </CardContent>
  </Card>;
}
