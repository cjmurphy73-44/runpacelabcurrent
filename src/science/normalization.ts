// src/science/normalization.ts
// Discipline-specific normalized effort. Replaces raw pace/power averages with
// the metric each sport actually prescribes against its own threshold.
//
//  Running  — Minetti grade-adjusted speed → Normalized Graded Pace → rTSS vs
//             threshold pace (Daniels/Coggan hybrid, same value as sec/km ratio).
//  Cycling  — Coggan Normalized Power: 30 s rolling average, values raised to the
//             4th power, mean of those, 4th root → IF vs FTP → TSS.
//  Swimming — Critical Swim Speed from a 200 m / 400 m benchmark, normalized swim
//             speed (same 30 s / 4th-power weighting) → sTSS vs CSS.
//  Fallback — Banister HR-reserve TRIMP, or Edwards zone TRIMP when only a zone
//             distribution exists (no stream, no threshold anchor).
//
// All functions are pure and deterministic: identical input → identical output.
//
// Sources:
//  - Minetti et al. 2002, J Appl Physiol 93:1039-1046 (energy cost of grade).
//  - Coggan 2003, Training and Racing with a Power Meter (NP / IF / TSS).
//  - Wakayoshi et al. 1992 (critical swim speed); Swim Smooth sTSS convention.
//  - Banister 1991 (TRIMP); Edwards 1993 (zone-weighted TRIMP).
//
// Limitations:
//  - Grade adjustment is only meaningful when altitude and distance are both
//    present in the same units (metres) on the stream.
//  - NP weights surges heavily by design; a session of pure coasting intervals
//    reads higher than its physiological cost.
//  - CSS needs a genuine 200/400 maximal pair; a mistyped benchmark propagates.

import { calcRTSS, gradeCostFactor } from './grade';
import { calcTrimp, type Sex } from './trimp';

export type NormalizationSport = 'running' | 'cycling' | 'swimming' | 'strength' | 'triathlon' | 'other';

export type LoadMethod = 'gap_rtss' | 'power_tss' | 'css_stss' | 'banister_trimp' | 'edwards_trimp';

export type Provenance = 'measured_device' | 'calculated_estimate';

export interface StreamSample {
  time: number;
  heart_rate?: number | null;
  altitude?: number | null;
  /** Metres. */
  distance?: number | null;
  /** Metres per second. */
  speed?: number | null;
  /** Watts. */
  power?: number | null;
}

export interface LapSample {
  duration_s?: number | null;
  distance_km?: number | null;
  avg_hr?: number | null;
}

export const NORMALIZED_POWER_WINDOW_SECONDS = 30;
export const MIN_POWER_SAMPLES = 30;
/** Below this many stream points grade adjustment falls back to session averages. */
const MIN_STREAM_SAMPLES = 10;

const round = (value: number, dp = 2): number => {
  if (!Number.isFinite(value)) return 0;
  const f = Math.pow(10, dp);
  return Math.round(value * f) / f;
};

const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

export function normalizeSport(raw?: string | null): NormalizationSport {
  const s = (raw || '').toLowerCase();
  if (s.startsWith('run')) return 'running';
  if (s.startsWith('cyc') || s.includes('bike')) return 'cycling';
  if (s.startsWith('swim')) return 'swimming';
  if (s.startsWith('tri')) return 'triathlon';
  if (s.startsWith('strength')) return 'strength';
  return 'other';
}

/** Seconds per kilometre → metres per second. */
export function speedFromPace(paceSecPerKm: number): number {
  if (!paceSecPerKm || paceSecPerKm <= 0) return 0;
  return 1000 / paceSecPerKm;
}

/** Metres per second → seconds per kilometre. */
export function paceFromSpeed(speedMps: number): number {
  if (!speedMps || speedMps <= 0) return 0;
  return 1000 / speedMps;
}

/** Simple centred-window running mean over an evenly sampled series. */
export function rollingMean(values: number[], windowSamples = NORMALIZED_POWER_WINDOW_SECONDS): number[] {
  const window = Math.max(1, Math.round(windowSamples));
  const out: number[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= window) sum -= values[i - window];
    out.push(sum / Math.min(i + 1, window));
  }
  return out;
}

/** Fourth-power weighted mean (the final step of Coggan's NP algorithm). */
export function fourthPowerNormalizedMean(values: number[]): number {
  const clean = values.filter((v) => finite(v) && v >= 0);
  if (clean.length === 0) return 0;
  const fourth = clean.reduce((sum, v) => sum + Math.pow(v, 4), 0) / clean.length;
  return Math.pow(fourth, 0.25);
}

/**
 * Coggan Normalized Power. Values are assumed evenly sampled (1 Hz by default).
 * Fewer samples than one window collapse to the arithmetic mean — flagged by the
 * caller via `method_note`, never silently treated as normalized data.
 */
export function computeNormalizedPower(powerValues: number[], windowSeconds = NORMALIZED_POWER_WINDOW_SECONDS): number {
  const clean = powerValues.filter((v) => finite(v) && v >= 0);
  if (clean.length === 0) return 0;
  const window = Math.max(1, Math.round(windowSeconds));
  if (clean.length < window) {
    return round(clean.reduce((s, v) => s + v, 0) / clean.length, 1);
  }
  return round(fourthPowerNormalizedMean(rollingMean(clean, window)), 1);
}

/** Resample an irregular channel onto a 1 s grid using the last known value. */
export function resampleToSeconds(
  points: Array<{ time: number; value?: number | null }>,
  intervalSeconds = 1,
): number[] {
  const clean = points
    .filter((p) => finite(p.time) && finite(p.value) && (p.value as number) >= 0)
    .sort((a, b) => a.time - b.time);
  if (clean.length === 0) return [];
  const start = clean[0].time;
  const end = clean[clean.length - 1].time;
  const step = Math.max(1, Math.round(intervalSeconds));
  if (end - start > 86400) return [];
  const out: number[] = [];
  let cursor = 0;
  for (let t = start; t <= end; t += step) {
    while (cursor + 1 < clean.length && clean[cursor + 1].time <= t) cursor++;
    out.push(clean[cursor].value as number);
  }
  return out;
}

/** Normalized power from a raw power stream (irregular sample times allowed). */
export function normalizedPowerFromStream(
  stream: StreamSample[] | null | undefined,
  windowSeconds = NORMALIZED_POWER_WINDOW_SECONDS,
): number {
  if (!Array.isArray(stream) || stream.length === 0) return 0;
  const grid = resampleToSeconds(stream.map((s) => ({ time: s.time, value: s.power })));
  if (grid.length < MIN_POWER_SAMPLES) return 0;
  return computeNormalizedPower(grid, windowSeconds);
}

export interface CyclingNormalization {
  method: 'power_tss';
  normalized_power_watts: number;
  ftp_watts: number;
  intensity_factor: number;
  tss: number;
}

/** NP / IF / TSS against Functional Threshold Power. Returns null without usable power. */
export function computeCyclingNormalization(
  stream: StreamSample[] | null | undefined,
  ftpWatts: number | null | undefined,
  durationSeconds: number,
): CyclingNormalization | null {
  const ftp = finite(ftpWatts) ? ftpWatts : 0;
  const np = normalizedPowerFromStream(stream);
  if (!ftp || ftp <= 0 || np <= 0 || !durationSeconds || durationSeconds <= 0) return null;
  const intensityFactor = np / ftp;
  const tss = (durationSeconds * np * intensityFactor) / (ftp * 3600) * 100;
  return {
    method: 'power_tss',
    normalized_power_watts: round(np, 1),
    ftp_watts: round(ftp, 0),
    intensity_factor: round(intensityFactor, 3),
    tss: round(tss, 1),
  };
}

export interface GapPoint {
  time: number;
  /** Grade-adjusted speed, m/s — higher is better. */
  gapSpeed: number;
  heart_rate: number | null;
}

/**
 * Grade-adjusted speed series. Grade = Δaltitude / Δdistance (both metres);
 * equivalent flat speed = actual speed × Minetti cost factor.
 */
export function gradeAdjustedSpeedSeries(stream: StreamSample[] | null | undefined): GapPoint[] {
  if (!Array.isArray(stream) || stream.length < 2) return [];
  const points: GapPoint[] = [];
  for (let i = 1; i < stream.length; i++) {
    const prev = stream[i - 1];
    const cur = stream[i];
    const dt = cur.time - prev.time;
    if (!finite(dt) || dt <= 0) continue;
    const dDist = finite(cur.distance) && finite(prev.distance) ? cur.distance - prev.distance : null;
    if (dDist !== null && dDist <= 0) continue;
    const speed = finite(cur.speed) && cur.speed > 0 ? cur.speed : dDist !== null ? dDist / dt : null;
    if (speed === null || speed <= 0) continue;
    const dAlt = finite(cur.altitude) && finite(prev.altitude) ? cur.altitude - prev.altitude : 0;
    const grade = dDist && dDist > 0 ? dAlt / dDist : 0;
    points.push({
      time: cur.time,
      gapSpeed: speed * gradeCostFactor(grade),
      heart_rate: finite(cur.heart_rate) ? cur.heart_rate : null,
    });
  }
  return points;
}

/** Time-weighted mean of a speed series. */
export function timeWeightedMeanSpeed(points: GapPoint[]): number | null {
  if (points.length === 0) return null;
  let weight = 0;
  let sum = 0;
  for (let i = 1; i < points.length; i++) {
    const dt = points[i].time - points[i - 1].time;
    if (!finite(dt) || dt <= 0) continue;
    weight += dt;
    sum += points[i].gapSpeed * dt;
  }
  if (weight > 0) return sum / weight;
  const simple = points.reduce((s, p) => s + p.gapSpeed, 0) / points.length;
  return simple;
}

/** Lap-derived speed (no grade information available). */
export function lapNormalizedSpeed(laps: LapSample[] | null | undefined): number | null {
  if (!Array.isArray(laps) || laps.length === 0) return null;
  let distance = 0;
  let duration = 0;
  for (const lap of laps) {
    if (!finite(lap.distance_km) || !finite(lap.duration_s)) continue;
    if (lap.distance_km <= 0 || lap.duration_s <= 0) continue;
    distance += lap.distance_km * 1000;
    duration += lap.duration_s;
  }
  if (duration <= 0) return null;
  return distance / duration;
}

export interface RunningNormalization {
  method: 'gap_rtss';
  normalized_speed_mps: number;
  gap_sec_per_km: number;
  threshold_speed_mps: number;
  intensity_factor: number;
  rtss: number;
  /** Which input produced the normalized speed. */
  source: 'stream' | 'laps' | 'session';
}

/** Grade-adjusted running load against threshold pace. */
export function computeRunningNormalization(input: {
  stream?: StreamSample[] | null;
  laps?: LapSample[] | null;
  durationSeconds: number;
  distanceKm?: number | null;
  thresholdPaceSecPerKm?: number | null;
}): RunningNormalization | null {
  const thresholdSpeed = speedFromPace(input.thresholdPaceSecPerKm || 0);
  if (!thresholdSpeed || !input.durationSeconds || input.durationSeconds <= 0) return null;

  let normalizedSpeed: number | null = null;
  let source: RunningNormalization['source'] = 'session';

  const stream = input.stream || [];
  if (stream.length >= MIN_STREAM_SAMPLES) {
    const series = gradeAdjustedSpeedSeries(stream);
    normalizedSpeed = timeWeightedMeanSpeed(series);
    if (normalizedSpeed) source = 'stream';
  }
  if (!normalizedSpeed) {
    normalizedSpeed = lapNormalizedSpeed(input.laps);
    if (normalizedSpeed) source = 'laps';
  }
  if (!normalizedSpeed && finite(input.distanceKm) && input.distanceKm > 0) {
    normalizedSpeed = (input.distanceKm * 1000) / input.durationSeconds;
    source = 'session';
  }
  if (!normalizedSpeed || normalizedSpeed <= 0) return null;

  const intensityFactor = normalizedSpeed / thresholdSpeed;
  return {
    method: 'gap_rtss',
    normalized_speed_mps: round(normalizedSpeed, 3),
    gap_sec_per_km: round(paceFromSpeed(normalizedSpeed), 0),
    threshold_speed_mps: round(thresholdSpeed, 3),
    intensity_factor: round(intensityFactor, 3),
    rtss: round(calcRTSS(input.durationSeconds, normalizedSpeed, thresholdSpeed), 1),
    source,
  };
}

export interface CriticalSwimSpeed {
  css_mps: number;
  css_sec_per_100m: number;
}

/** CSS = (400 − 200) / (t400 − t200). */
export function computeCriticalSwimSpeed(
  t200Seconds: number,
  t400Seconds: number,
): CriticalSwimSpeed | null {
  if (!finite(t200Seconds) || !finite(t400Seconds)) return null;
  if (t200Seconds <= 0 || t400Seconds <= t200Seconds) return null;
  const cssMps = 200 / (t400Seconds - t200Seconds);
  return {
    css_mps: round(cssMps, 4),
    css_sec_per_100m: round(100 / cssMps, 1),
  };
}

export interface SwimNormalization {
  method: 'css_stss';
  normalized_speed_mps: number;
  css_mps: number;
  intensity_factor: number;
  stss: number;
  source: 'stream' | 'laps' | 'session';
}

/** Critical-swim-speed relative load. */
export function computeSwimNormalization(input: {
  stream?: StreamSample[] | null;
  laps?: LapSample[] | null;
  durationSeconds: number;
  distanceKm?: number | null;
  cssMps?: number | null;
}): SwimNormalization | null {
  const css = finite(input.cssMps) ? input.cssMps : 0;
  if (!css || css <= 0 || !input.durationSeconds || input.durationSeconds <= 0) return null;

  let normalizedSpeed: number | null = null;
  let source: SwimNormalization['source'] = 'session';

  const stream = input.stream || [];
  if (stream.length >= MIN_POWER_SAMPLES) {
    const grid = resampleToSeconds(stream.map((s) => ({ time: s.time, value: s.speed })));
    if (grid.length >= MIN_POWER_SAMPLES) {
      normalizedSpeed = fourthPowerNormalizedMean(rollingMean(grid, NORMALIZED_POWER_WINDOW_SECONDS));
      if (normalizedSpeed > 0) source = 'stream';
    }
  }
  if (!normalizedSpeed || normalizedSpeed <= 0) {
    normalizedSpeed = lapNormalizedSpeed(input.laps);
    if (normalizedSpeed) source = 'laps';
  }
  if (!normalizedSpeed && finite(input.distanceKm) && input.distanceKm > 0) {
    normalizedSpeed = (input.distanceKm * 1000) / input.durationSeconds;
    source = 'session';
  }
  if (!normalizedSpeed || normalizedSpeed <= 0) return null;

  const intensityFactor = normalizedSpeed / css;
  return {
    method: 'css_stss',
    normalized_speed_mps: round(normalizedSpeed, 3),
    css_mps: round(css, 4),
    intensity_factor: round(intensityFactor, 3),
    stss: round((input.durationSeconds / 3600) * Math.pow(intensityFactor, 2) * 100, 1),
    source,
  };
}

/** Edwards zone-weighted TRIMP: Σ minutes in zone × zone weight (1–5). */
export function calcEdwardsTrimp(zoneSeconds: number[] | null | undefined): number {
  if (!Array.isArray(zoneSeconds) || zoneSeconds.length === 0) return 0;
  const weights = [1, 2, 3, 4, 5];
  const total = zoneSeconds.reduce((sum, seconds, i) => {
    if (!finite(seconds) || seconds <= 0) return sum;
    return sum + (seconds / 60) * (weights[i] ?? weights[weights.length - 1]);
  }, 0);
  return round(total, 1);
}

export interface FallbackLoad {
  method: 'banister_trimp' | 'edwards_trimp';
  load: number;
}

/** Banister TRIMP first (needs average HR), Edwards zone TRIMP otherwise. */
export function resolveFallbackLoad(input: {
  durationSeconds: number;
  avgHr?: number | null;
  restHr?: number | null;
  maxHr?: number | null;
  sex?: Sex;
  zoneSeconds?: number[] | null;
}): FallbackLoad | null {
  const durationMinutes = (input.durationSeconds || 0) / 60;
  if (durationMinutes <= 0) return null;
  if (finite(input.avgHr) && input.avgHr > 0 && finite(input.maxHr) && finite(input.restHr)) {
    const trimp = calcTrimp(
      durationMinutes,
      input.avgHr,
      input.restHr as number,
      input.maxHr as number,
      input.sex || 'male',
    );
    if (trimp > 0) return { method: 'banister_trimp', load: round(trimp, 1) };
  }
  const edwards = calcEdwardsTrimp(input.zoneSeconds);
  if (edwards > 0) return { method: 'edwards_trimp', load: edwards };
  return null;
}

export interface NormalizeSessionInput {
  sport?: string | null;
  durationSeconds: number;
  distanceKm?: number | null;
  avgHr?: number | null;
  restHr?: number | null;
  maxHr?: number | null;
  sex?: Sex;
  zoneSeconds?: number[] | null;
  stream?: StreamSample[] | null;
  laps?: LapSample[] | null;
  /** Running threshold pace, seconds per kilometre. */
  thresholdPaceSecPerKm?: number | null;
  ftpWatts?: number | null;
  /** Critical swim speed, metres per second. */
  cssMps?: number | null;
}

export interface SessionNormalization {
  sport: NormalizationSport;
  method: LoadMethod;
  /** Primary session load on the 100 ≈ one hour at threshold scale. */
  load: number;
  intensity_factor: number | null;
  normalized_speed_mps: number | null;
  normalized_power_watts: number | null;
  gap_sec_per_km: number | null;
  threshold_speed_mps: number | null;
  source: 'stream' | 'laps' | 'session' | 'heart_rate' | 'zones' | null;
  /** Deterministic, human-readable description of how `load` was produced. */
  note: string;
}

/**
 * Route a session to its discipline's convention, falling back to HR-based load
 * only when the sport's anchor (threshold pace / FTP / CSS) or data is missing.
 */
export function normalizeSession(input: NormalizeSessionInput): SessionNormalization {
  const sport = normalizeSport(input.sport);
  const base: SessionNormalization = {
    sport,
    method: 'banister_trimp',
    load: 0,
    intensity_factor: null,
    normalized_speed_mps: null,
    normalized_power_watts: null,
    gap_sec_per_km: null,
    threshold_speed_mps: null,
    source: null,
    note: '',
  };

  if (sport === 'running') {
    const run = computeRunningNormalization({
      stream: input.stream,
      laps: input.laps,
      durationSeconds: input.durationSeconds,
      distanceKm: input.distanceKm,
      thresholdPaceSecPerKm: input.thresholdPaceSecPerKm,
    });
    if (run) {
      return {
        ...base,
        method: 'gap_rtss',
        load: run.rtss,
        intensity_factor: run.intensity_factor,
        normalized_speed_mps: run.normalized_speed_mps,
        gap_sec_per_km: run.gap_sec_per_km,
        threshold_speed_mps: run.threshold_speed_mps,
        source: run.source,
        note: `rTSS from grade-adjusted ${run.source} speed vs threshold pace`,
      };
    }
  }

  if (sport === 'cycling') {
    const bike = computeCyclingNormalization(input.stream, input.ftpWatts, input.durationSeconds);
    if (bike) {
      return {
        ...base,
        method: 'power_tss',
        load: bike.tss,
        intensity_factor: bike.intensity_factor,
        normalized_power_watts: bike.normalized_power_watts,
        source: 'stream',
        note: 'TSS from 30 s fourth-power normalized power vs FTP',
      };
    }
  }

  if (sport === 'swimming') {
    const swim = computeSwimNormalization({
      stream: input.stream,
      laps: input.laps,
      durationSeconds: input.durationSeconds,
      distanceKm: input.distanceKm,
      cssMps: input.cssMps,
    });
    if (swim) {
      return {
        ...base,
        method: 'css_stss',
        load: swim.stss,
        intensity_factor: swim.intensity_factor,
        normalized_speed_mps: swim.normalized_speed_mps,
        threshold_speed_mps: round(swim.css_mps, 3),
        source: swim.source,
        note: `sTSS from normalized swim speed vs critical swim speed (${swim.source})`,
      };
    }
  }

  const fallback = resolveFallbackLoad({
    durationSeconds: input.durationSeconds,
    avgHr: input.avgHr,
    restHr: input.restHr,
    maxHr: input.maxHr,
    sex: input.sex,
    zoneSeconds: input.zoneSeconds,
  });
  if (fallback) {
    return {
      ...base,
      method: fallback.method,
      load: fallback.load,
      source: fallback.method === 'banister_trimp' ? 'heart_rate' : 'zones',
      note:
        fallback.method === 'banister_trimp'
          ? 'Banister HR-reserve TRIMP (no threshold anchor or usable stream)'
          : 'Edwards zone-weighted TRIMP (zone distribution only)',
    };
  }

  return { ...base, note: 'No usable load input for this session' };
}