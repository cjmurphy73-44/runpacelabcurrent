// base44/shared/timelineReconciler.ts
// Unified multi-stream timeline reconciler. Aligns asynchronous CanonicalSample
// streams (continuous-ish daily biosignals, daily sleep summaries, periodic lab
// results) onto a common UTC daily timeline. Produces one ReconciledDay per date
// with per-channel provenance and a composite confidence score.
//
// Alignment policy:
//   - Daily point signals (hrv, resting_hr, sleep, readiness, etc.): same-UTC-date
//     samples win; when multiple sources provide a channel on a date, the highest-
//     confidence source wins (tie-break: latest timestamp). This is the
//     nearest-neighbor match for same-day daily data.
//   - Lab results are sparse (weeks–months apart): carried verbatim on their date,
//     NEVER interpolated across days, so they cannot distort continuous-stream daily
//     aggregation.
//   - Composite confidence = lowest channel confidence present, discounted by coverage
//     (how many of the expected biosignal channels actually reported that day).
//
// Plain module — no Deno.serve. Import from a function entry via:
//   import { reconcileTimeline } from '../../shared/timelineReconciler.ts';

import { confidenceRank, type CanonicalSample, type Confidence } from './canonicalSample.ts';

export interface ReconciledChannel {
  value: number;
  source_provider: string;
  confidence: Confidence;
  n: number; // samples contributing to this channel on this day
}

export interface ReconciledDay {
  date: string; // YYYY-MM-DD (UTC)
  channels: Record<string, ReconciledChannel>;
  composite_confidence: Confidence;
  coverage: number; // 0..1 fraction of expected channels present
  lab_results: CanonicalSample[];
}

const EXPECTED_CHANNELS = ['hrv', 'resting_hr', 'sleep_score', 'sleep_duration', 'readiness'];

function utcDate(ts: string): string {
  return (ts && ts.length >= 10 ? ts.slice(0, 10) : ts);
}

// Reconcile a flat list of CanonicalSamples into per-day ReconciledDays, most-recent
// first. `rangeDays` bounds how far back to emit days (default 30).
export function reconcileTimeline(samples: CanonicalSample[], rangeDays = 30): ReconciledDay[] {
  const byDate = new Map<string, CanonicalSample[]>();
  for (const s of samples || []) {
    if (!s || !s.timestamp_utc) continue;
    const d = utcDate(s.timestamp_utc);
    if (!byDate.has(d)) byDate.set(d, []);
    byDate.get(d)!.push(s);
  }

  // Build the set of dates to emit: any date that has a sample, within the lookback.
  const today = new Date();
  const dateKeys: string[] = [];
  for (let i = 0; i < rangeDays; i++) {
    const dt = new Date(today.getTime() - i * 86400000);
    dateKeys.push(dt.toISOString().slice(0, 10));
  }
  // Also include any sample dates outside the lookback so sparse lab data isn't lost.
  for (const d of byDate.keys()) if (!dateKeys.includes(d)) dateKeys.push(d);
  dateKeys.sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));

  const out: ReconciledDay[] = [];
  for (const date of dateKeys) {
    const daySamples = byDate.get(date) || [];
    if (daySamples.length === 0) continue;

    // Channels: group non-lab samples by stream_type, pick highest-confidence source.
    const groups = new Map<string, CanonicalSample[]>();
    const labs: CanonicalSample[] = [];
    for (const s of daySamples) {
      if (s.stream_type === 'lab') { labs.push(s); continue; }
      if (!groups.has(s.stream_type)) groups.set(s.stream_type, []);
      groups.get(s.stream_type)!.push(s);
    }

    const channels: Record<string, ReconciledChannel> = {};
    for (const [stream_type, arr] of groups) {
      // Highest confidence wins; tie-break by latest timestamp_utc.
      let best = arr[0];
      for (const s of arr) {
        if (
          confidenceRank(s.confidence) > confidenceRank(best.confidence) ||
          (confidenceRank(s.confidence) === confidenceRank(best.confidence) && s.timestamp_utc > best.timestamp_utc)
        ) {
          best = s;
        }
      }
      channels[stream_type] = {
        value: best.value,
        source_provider: best.source_provider,
        confidence: best.confidence,
        n: arr.length,
      };
    }

    // Coverage: fraction of expected biosignal channels present.
    const present = EXPECTED_CHANNELS.filter((c) => channels[c]).length;
    const coverage = present / EXPECTED_CHANNELS.length;

    // Composite confidence: min channel confidence, dropped to 'low' if coverage < 0.4.
    let minRank = Infinity;
    for (const c of Object.values(channels)) minRank = Math.min(minRank, confidenceRank(c.confidence));
    let composite: Confidence = 'high';
    if (minRank <= 0 || !isFinite(minRank)) composite = 'low';
    else if (coverage < 0.4) composite = 'low';
    else if (minRank === 3) composite = 'high';
    else if (minRank === 2) composite = 'medium';
    else composite = 'low';

    out.push({ date, channels, composite_confidence: composite, coverage, lab_results: labs });
  }

  return out;
}