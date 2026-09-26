// base44/shared/canonicalSample.ts
// Canonical normalization layer. Defines the single CanonicalSample shape every
// ingest path converges to, plus per-vendor converters that map provider payloads
// (and the existing NormalizedRecovery shape) into CanonicalSamples with UTC
// timestamps, SI units, and quality confidence flags. Plain module — no Deno.serve.
//
// Stream types here are the daily/periodic biosignals (HR, sleep, HRV, readiness,
// lab results). Sub-second workout telemetry (FIT/TCX streams) stays on the
// existing streamReconcile ladder — that is a different granularity and is not
// forced through CanonicalSample.
//
// Import from a function entry via:
//   import { recoveryToCanonical, labRowToCanonical, confidenceRank } from '../../shared/canonicalSample.ts';

export type StreamType =
  | 'resting_hr'
  | 'hrv'
  | 'sleep_score'
  | 'sleep_duration'
  | 'body_battery'
  | 'stress'
  | 'readiness'
  | 'lab';

export type Confidence = 'high' | 'medium' | 'low';

export interface CanonicalSample {
  athlete_id: string;
  stream_type: StreamType;
  source_provider: string; // garmin | coros | strava | oura | whoop | polar | withings | fitbit | suunto | manual | lab
  timestamp_utc: string;   // ISO-8601 UTC
  value: number;           // SI / canonical unit (see UNIT_BY_STREAM)
  unit: string;
  confidence: Confidence;
  // Lab-only metadata:
  metric_name?: string;
  reference_low?: number;
  reference_high?: number;
}

export const UNIT_BY_STREAM: Record<StreamType, string> = {
  resting_hr: 'bpm',
  hrv: 'ms',
  sleep_score: 'count',
  sleep_duration: 'hours',
  body_battery: 'count',
  stress: 'count',
  readiness: 'count',
  lab: '',
};

const CONF_RANK: Record<Confidence, number> = { high: 3, medium: 2, low: 1 };
export function confidenceRank(c: Confidence): number { return CONF_RANK[c] || 0; }

function dateToUtc(date: string): string {
  // Accept YYYY-MM-DD or full ISO; normalize to a UTC midnight anchor for daily samples.
  const d = date && date.length >= 10 ? date.slice(0, 10) : date;
  return `${d}T00:00:00Z`;
}

function pushSample(
  out: CanonicalSample[],
  athleteId: string,
  source: string,
  date: string,
  stream_type: StreamType,
  value: number | null | undefined,
  confidence: Confidence,
) {
  if (value == null || typeof value !== 'number' || !isFinite(value) || value <= 0) return;
  out.push({
    athlete_id: athleteId,
    stream_type,
    source_provider: source,
    timestamp_utc: dateToUtc(date),
    value,
    unit: UNIT_BY_STREAM[stream_type],
    confidence,
  });
}

// Maps a NormalizedRecovery (from recoveryIngest's per-provider normalizers) into
// CanonicalSamples. `source` is the provider slug; manual entries are low-confidence.
export function recoveryToCanonical(
  athleteId: string,
  source: string,
  date: string,
  n: { hrv?: number | null; sleep_score?: number | null; sleep_duration_hours?: number | null; resting_hr?: number | null; body_battery?: number | null; stress_score?: number | null; provider_readiness_score?: number | null } | null,
): CanonicalSample[] {
  if (!n || !date) return [];
  const confidence: Confidence = source === 'manual' ? 'low' : 'high';
  const out: CanonicalSample[] = [];
  pushSample(out, athleteId, source, date, 'hrv', n.hrv, confidence);
  pushSample(out, athleteId, source, date, 'sleep_score', n.sleep_score, confidence);
  pushSample(out, athleteId, source, date, 'sleep_duration', n.sleep_duration_hours, confidence);
  pushSample(out, athleteId, source, date, 'resting_hr', n.resting_hr, confidence);
  pushSample(out, athleteId, source, date, 'body_battery', n.body_battery, confidence);
  pushSample(out, athleteId, source, date, 'stress', n.stress_score, confidence);
  pushSample(out, athleteId, source, date, 'readiness', n.provider_readiness_score, confidence);
  return out;
}

// Lab result row -> a single CanonicalSample (stream_type 'lab'). Sparse by nature —
// the reconciler carries these separately and never interpolates across days.
export function labRowToCanonical(
  athleteId: string,
  row: { date?: string; metric_name?: string; value?: number | null; unit?: string; reference_low?: number | null; reference_high?: number | null },
): CanonicalSample | null {
  if (!row || !row.date || row.value == null || !row.metric_name) return null;
  const v = Number(row.value);
  if (!isFinite(v)) return null;
  return {
    athlete_id: athleteId,
    stream_type: 'lab',
    source_provider: 'lab',
    timestamp_utc: dateToUtc(row.date),
    value: v,
    unit: (row.unit || '').trim(),
    confidence: 'high',
    metric_name: String(row.metric_name),
    reference_low: row.reference_low != null ? Number(row.reference_low) : undefined,
    reference_high: row.reference_high != null ? Number(row.reference_high) : undefined,
  };
}