// src/science/athleteState.ts
// Deterministic AthleteStateSummary — the single structured object handed to any
// LLM. Every number in it is produced by the math modules; the model only writes
// prose about values it was given.
//
// Provenance is explicit per block:
//   measured_device      — the wearable reported the value (native calories, stream
//                          channels, per-second / per-lap zone time).
//   calculated_estimate  — the value came from our equations (normalized load,
//                          zone estimate from average HR, derived EF).
//
// The stored entity contracts are unchanged: `toStoredCaloriesSource` maps the
// summary's provenance back onto the existing WorkoutSession.calories_source enum.

import {
  normalizeSession,
  type LapSample,
  type LoadMethod,
  type NormalizationSport,
  type Provenance,
  type SessionNormalization,
  type StreamSample,
} from './normalization';
import { computeAerobicDecoupling, type DecouplingResult } from './decoupling';
import {
  evaluateAdaptation,
  type AdaptationAssessment,
  type DailyLoadPoint,
} from './adaptation';
import type { Sex } from './trimp';

export type StoredCaloriesSource = 'device' | 'estimated' | 'manual';

export const PROVENANCE = {
  MEASURED_DEVICE: 'measured_device' as Provenance,
  CALCULATED_ESTIMATE: 'calculated_estimate' as Provenance,
};

/** Map summary provenance back onto the stored WorkoutSession enum. */
export function toStoredCaloriesSource(provenance: Provenance): StoredCaloriesSource {
  return provenance === PROVENANCE.MEASURED_DEVICE ? 'device' : 'estimated';
}

/** Map a stored calories_source onto summary provenance. */
export function caloriesProvenance(source?: StoredCaloriesSource | null): Provenance {
  if (source === 'device' || source === 'manual') return PROVENANCE.MEASURED_DEVICE;
  return PROVENANCE.CALCULATED_ESTIMATE;
}

export interface AthleteStateInput {
  athleteId: string;
  date: string;
  sport: string;
  durationSeconds: number;
  distanceKm?: number | null;
  avgHr?: number | null;
  maxHr?: number | null;
  restHr?: number | null;
  sex?: Sex;
  avgPower?: number | null;
  zoneSeconds?: number[] | null;
  zoneMethod?: 'stream' | 'laps' | 'average' | 'none' | null;
  calories?: number | null;
  caloriesSource?: StoredCaloriesSource | null;
  stream?: StreamSample[] | null;
  laps?: LapSample[] | null;
  thresholdPaceSecPerKm?: number | null;
  ftpWatts?: number | null;
  cssMps?: number | null;
  loadHistory?: DailyLoadPoint[];
  /** Optional precomputed values so the builder never recomputes the same model. */
  normalization?: SessionNormalization;
  adaptation?: AdaptationAssessment;
}

export interface AthleteStateSummary {
  schema_version: 1;
  athlete_id: string;
  date: string;
  sport: NormalizationSport;
  session: {
    duration_seconds: number;
    duration_minutes: number;
    distance_km: number | null;
    avg_hr: number | null;
    max_hr: number | null;
    avg_power_watts: number | null;
    avg_pace_sec_per_km: number | null;
    calories: number | null;
  };
  normalized: {
    method: LoadMethod;
    load: number;
    intensity_factor: number | null;
    normalized_speed_mps: number | null;
    normalized_power_watts: number | null;
    gap_sec_per_km: number | null;
    threshold_speed_mps: number | null;
    source: string | null;
    note: string;
  };
  aerobic: {
    metric: DecouplingResult['metric'];
    efficiency_factor: number | null;
    first_half_efficiency: number | null;
    second_half_efficiency: number | null;
    decoupling_pct: number | null;
    flag: string | null;
    evaluated: boolean;
  };
  zones: {
    zone_seconds: number[];
    zone_method: string;
    distribution_pct: number[];
  };
  load_state: {
    ctl: number;
    atl: number;
    tsb: number;
    acwr: number | null;
    ctl_ramp_7d: number | null;
    tsb_negative_streak_days: number;
  };
  adaptation_flags: string[];
  provenance: {
    session_load: Provenance;
    calories: Provenance;
    zones: Provenance;
    streams: Provenance;
  };
}

const round = (value: number, dp = 2): number => {
  if (!Number.isFinite(value)) return 0;
  const f = Math.pow(10, dp);
  return Math.round(value * f) / f;
};

const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

/** Speed (pace sports) or power (cycling) samples for the decoupling engine. */
export function buildWorkloadSamples(stream: StreamSample[] | null | undefined, sport?: string | null) {
  if (!Array.isArray(stream) || stream.length === 0) return [];
  const powerSport = /cyc|bike|row/i.test(sport || '');
  const samples = [];
  for (let i = 1; i < stream.length; i++) {
    const prev = stream[i - 1];
    const cur = stream[i];
    const dt = cur.time - prev.time;
    let value: number | null = null;
    if (powerSport) {
      value = finite(cur.power) ? cur.power : null;
    } else if (finite(cur.speed) && cur.speed > 0) {
      value = cur.speed;
    } else if (finite(cur.distance) && finite(prev.distance) && dt > 0) {
      value = (cur.distance - prev.distance) / dt;
    }
    if (value === null || value <= 0) continue;
    samples.push({ time: cur.time, value, heartRate: finite(cur.heart_rate) ? cur.heart_rate : null });
  }
  return samples;
}

/** Percentage split of zone seconds, summing to 100 (zeros when untracked). */
export function zoneDistribution(zoneSeconds?: number[] | null): number[] {
  const seconds = [0, 0, 0, 0, 0].map((_, i) => (finite(zoneSeconds?.[i]) ? (zoneSeconds as number[])[i] : 0));
  const total = seconds.reduce((s, v) => s + v, 0);
  if (total <= 0) return [0, 0, 0, 0, 0];
  return seconds.map((v) => round((v / total) * 100, 1));
}

/**
 * Build the deterministic state summary. Pure function: same inputs, same JSON.
 */
export function buildAthleteStateSummary(input: AthleteStateInput): AthleteStateSummary {
  const sport = (input.sport || 'other') as NormalizationSport;

  const normalized =
    input.normalization ||
    normalizeSession({
      sport: input.sport,
      durationSeconds: input.durationSeconds,
      distanceKm: input.distanceKm,
      avgHr: input.avgHr,
      restHr: input.restHr,
      maxHr: input.maxHr,
      sex: input.sex,
      zoneSeconds: input.zoneSeconds,
      stream: input.stream,
      laps: input.laps,
      thresholdPaceSecPerKm: input.thresholdPaceSecPerKm,
      ftpWatts: input.ftpWatts,
      cssMps: input.cssMps,
    });

  const decoupling = computeAerobicDecoupling(buildWorkloadSamples(input.stream, input.sport), {
    durationSeconds: input.durationSeconds,
    sport: input.sport,
    avgHrFallback: input.avgHr ?? null,
  });

  const adaptation =
    input.adaptation ||
    evaluateAdaptation(input.loadHistory || [], {
      ctlTimeConstantDays: 42,
      atlTimeConstantDays: 7,
    });

  const hasStream = Array.isArray(input.stream) && input.stream.length > 0;
  // Zones are a stream-derived quantity. Anything else is reported as absent rather
  // than estimated, so a summary-only session cannot feed a synthetic distribution
  // into the athlete summary the coach reads.
  const zoneMethod = input.zoneMethod === 'stream' ? 'stream' : 'none';
  const zoneSeconds = [0, 0, 0, 0, 0].map((_, i) =>
    zoneMethod === 'stream' && finite(input.zoneSeconds?.[i]) ? (input.zoneSeconds as number[])[i] : 0,
  );

  const avgPace =
    finite(input.distanceKm) && input.distanceKm > 0 && input.durationSeconds > 0
      ? round(input.durationSeconds / input.distanceKm, 0)
      : null;

  const flags = [...adaptation.flags];
  if (decoupling.flag && !flags.includes(decoupling.flag)) flags.push(decoupling.flag);

  return {
    schema_version: 1,
    athlete_id: input.athleteId,
    date: input.date,
    sport,
    session: {
      duration_seconds: Math.round(input.durationSeconds || 0),
      duration_minutes: round((input.durationSeconds || 0) / 60, 1),
      distance_km: finite(input.distanceKm) ? round(input.distanceKm, 2) : null,
      avg_hr: finite(input.avgHr) ? Math.round(input.avgHr) : null,
      max_hr: finite(input.maxHr) ? Math.round(input.maxHr) : null,
      avg_power_watts: finite(input.avgPower) ? round(input.avgPower, 0) : null,
      avg_pace_sec_per_km: avgPace,
      calories: finite(input.calories) ? round(input.calories, 0) : null,
    },
    normalized: {
      method: normalized.method,
      load: normalized.load,
      intensity_factor: normalized.intensity_factor,
      normalized_speed_mps: normalized.normalized_speed_mps,
      normalized_power_watts: normalized.normalized_power_watts,
      gap_sec_per_km: normalized.gap_sec_per_km,
      threshold_speed_mps: normalized.threshold_speed_mps,
      source: normalized.source,
      note: normalized.note,
    },
    aerobic: {
      metric: decoupling.metric,
      efficiency_factor: decoupling.efficiency_factor,
      first_half_efficiency: decoupling.first_half_efficiency,
      second_half_efficiency: decoupling.second_half_efficiency,
      decoupling_pct: decoupling.decoupling_pct,
      flag: decoupling.flag,
      evaluated: decoupling.evaluated,
    },
    zones: {
      zone_seconds: zoneSeconds,
      zone_method: zoneMethod,
      distribution_pct: zoneDistribution(zoneSeconds),
    },
    load_state: {
      ctl: adaptation.ctl,
      atl: adaptation.atl,
      tsb: adaptation.tsb,
      acwr: adaptation.acwr,
      ctl_ramp_7d: adaptation.ctl_ramp_7d,
      tsb_negative_streak_days: adaptation.tsb_negative_streak_days,
    },
    adaptation_flags: flags,
    provenance: {
      // Load is always our equation output, even when it is anchored to a
      // device-measured stream.
      session_load: PROVENANCE.CALCULATED_ESTIMATE,
      calories: caloriesProvenance(input.caloriesSource),
      zones:
        zoneMethod === 'stream'
          ? PROVENANCE.MEASURED_DEVICE
          : PROVENANCE.CALCULATED_ESTIMATE,
      streams: hasStream ? PROVENANCE.MEASURED_DEVICE : PROVENANCE.CALCULATED_ESTIMATE,
    },
  };
}