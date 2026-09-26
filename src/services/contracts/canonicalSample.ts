// src/services/contracts/canonicalSample.ts
// Frontend mirror of the CanonicalSample shape (base44/shared/canonicalSample.ts).
// Frontend code cannot import base44/ (server-only), so the type is re-declared here
// for hooks/components that reason about canonical telemetry.

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
  source_provider: string;
  timestamp_utc: string;
  value: number;
  unit: string;
  confidence: Confidence;
  metric_name?: string;
  reference_low?: number;
  reference_high?: number;
}

export interface AnomalyAlert {
  id: string;
  severity: 'danger' | 'warning' | 'positive';
  title: string;
  detail: string;
  cue?: string;
}

export interface SynthesisResult {
  anomalies: AnomalyAlert[];
  synthesisText: string;
  confidence: Confidence;
  asOf: string;
  empty?: boolean;
}