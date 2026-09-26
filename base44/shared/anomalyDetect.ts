// base44/shared/anomalyDetect.ts
// Pure exception-detection logic ported from src/hooks/useAnomalyAlerts.ts so the
// backend synthesizeExceptions function and the frontend hook share identical
// rules. Plain module — no Deno.serve.

export interface AnomalyAlert {
  id: string;
  severity: 'danger' | 'warning' | 'positive';
  title: string;
  detail: string;
  cue?: string;
}

function avg(nums: number[]): number {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

// metrics: recent DailyMetrics, most-recent first.
// workouts: recent WorkoutSessions, most-recent first.
// athlete: AthleteProfile (for fallback CTL/ATL/TSB).
export function detectAnomalies(metrics: any[] = [], workouts: any[] = [], athlete: any = {}): AnomalyAlert[] {
  const out: AnomalyAlert[] = [];

  const latestMetric = metrics[0];
  const tsb = latestMetric?.calculated_tsb ?? athlete.current_tsb;
  const ctl = latestMetric?.calculated_ctl ?? athlete.current_ctl;
  const atl = latestMetric?.calculated_atl ?? athlete.current_atl;

  if (typeof tsb === 'number' && tsb < -20) {
    out.push({
      id: 'fatigue-risk',
      severity: tsb < -30 ? 'danger' : 'warning',
      title: 'Acute fatigue building',
      detail: `Your form (TSB) is ${Math.round(tsb)} — fatigue is outpacing fitness. Keep hard sessions short and prioritise recovery.`,
      cue: "Swap today's quality session for an easy or rest day unless you're tapering into a race.",
    });
  }

  if (metrics.length >= 4) {
    const recent = metrics.slice(0, 7).filter((m: any) => typeof m.readiness_score === 'number' && m.readiness_score > 0);
    if (recent.length >= 3) {
      const today = recent[0].readiness_score;
      const baseline = avg(recent.slice(1).map((m: any) => m.readiness_score));
      const dropPct = baseline > 0 ? ((baseline - today) / baseline) * 100 : 0;
      if (dropPct >= 15) {
        out.push({
          id: 'recovery-dip',
          severity: dropPct >= 25 ? 'danger' : 'warning',
          title: 'Recovery dipping',
          detail: `Today's readiness (${Math.round(today)}) is ${Math.round(dropPct)}% below your 7-day average (${Math.round(baseline)}).`,
          cue: 'Consider a recovery day or zone-1 only; check sleep and life stress.',
        });
      }
    }
  }

  if (metrics.length >= 4) {
    const hrvRecent = metrics.slice(0, 7).filter((m: any) => typeof m.hrv === 'number' && m.hrv > 0);
    if (hrvRecent.length >= 3) {
      const todayHrv = hrvRecent[0].hrv;
      const hrvBase = avg(hrvRecent.slice(1).map((m: any) => m.hrv));
      const hrvDropPct = hrvBase > 0 ? ((hrvBase - todayHrv) / hrvBase) * 100 : 0;
      if (hrvDropPct >= 12) {
        out.push({
          id: 'hrv-dip',
          severity: 'warning',
          title: 'HRV trending down',
          detail: `HRV (${todayHrv.toFixed(0)}ms) is ${Math.round(hrvDropPct)}% below your rolling baseline (${hrvBase.toFixed(0)}ms).`,
          cue: 'Autonomic recovery is lagging — back off intensity today.',
        });
      }
    }
  }

  if (metrics.length >= 14) {
    const last7 = metrics.slice(0, 7).map((m: any) => m.calculated_atl).filter((n) => typeof n === 'number');
    const prev7 = metrics.slice(7, 14).map((m: any) => m.calculated_atl).filter((n) => typeof n === 'number');
    if (last7.length >= 4 && prev7.length >= 4) {
      const spike = ((avg(last7) - avg(prev7)) / (avg(prev7) || 1)) * 100;
      if (spike >= 30) {
        out.push({
          id: 'load-spike',
          severity: 'warning',
          title: 'Training load spiking',
          detail: `Acute load is up ${Math.round(spike)}% versus last week. Rapid ramps raise injury risk.`,
          cue: 'Cap further increases near 10%/week until fatigue settles.',
        });
      }
    }
  }

  const last7Workouts = workouts.slice(0, 7);
  if (last7Workouts.length >= 5) {
    const sports = new Set(last7Workouts.map((w: any) => w.sport).filter(Boolean));
    const easyDays = last7Workouts.filter((w: any) => (w.session_trimp ?? 0) < 50 && (w.session_trimp ?? 0) > 0).length;
    if (sports.size <= 1 && easyDays === 0) {
      out.push({
        id: 'monotony',
        severity: 'warning',
        title: 'Training monotony',
        detail: 'The last week is all one sport at similar intensity — monotony blunts adaptation and raises injury risk.',
        cue: 'Add a cross-training day or a clear easy/recovery run to vary the stimulus.',
      });
    }
  }

  if (typeof tsb === 'number' && tsb > 5 && tsb < 25 && typeof ctl === 'number' && ctl > 30) {
    out.push({
      id: 'fresh-form',
      severity: 'positive',
      title: "You're race-ready",
      detail: `Form is positive (TSB +${Math.round(tsb)}) on a solid fitness base (CTL ${Math.round(ctl)}).`,
      cue: 'A great window for a key session or a tune-up race.',
    });
  }

  return out;
}