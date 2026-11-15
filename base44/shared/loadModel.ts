// base44/shared/loadModel.ts
// One place that decides where a session's training load came from.
//
// A verified per-second stream is integrated sample by sample (Banister's impulse series),
// so the load reflects the session's actual intensity profile. Anything else falls back to
// the average-HR equation and is labelled as an estimate. Every caller writes the result
// together with its provenance, so a load number can never be presented as measured when
// it was derived from a single average.

import { isUsableTelemetry } from './streamValidity.ts';
import { calcTrimp } from './physiology.ts';

// Same floors the zone engine uses: below these the recording does not describe enough of
// the session to call the load measured, so the average-HR estimate is used and labelled.
const MIN_STREAM_COVERAGE_PCT = 30;
const MIN_STREAM_DURATION_FRACTION = 0.3;

function banisterCoefficients(sex?: string): { a: number; b: number } {
  const isFemale = sex === 'female';
  return isFemale ? { a: 0.86, b: 1.67 } : { a: 0.64, b: 1.92 };
}

function heartRateReserve(hr: any, restHr: number, maxHr: number): number | null {
  if (!Number.isFinite(hr) || !Number.isFinite(restHr) || !Number.isFinite(maxHr) ||
      restHr <= 0 || maxHr <= restHr || hr < restHr || hr > maxHr) return null;
  return Math.max(0, Math.min(1, (hr - restHr) / (maxHr - restHr)));
}

// TRIMP = Σ (Δt / 60) · HRR · a · e^(b·HRR), summed over the session's own samples.
// The last known HR is carried through short dropouts and gaps over 60 s are treated as
// pauses, exactly like the time-in-zone accumulator in hrZones.ts.
export function integrateStreamTrimp(stream: any[], restHr: number, maxHr: number, sex?: string) {
  const { a, b } = banisterCoefficients(sex);
  let trimp = 0;
  let covered = 0;
  let total = 0;
  if (!Array.isArray(stream) || stream.length < 2) {
    return { trimp: 0, covered_seconds: 0, total_seconds: 0, coverage_pct: 0 };
  }
  let lastHr: number | null = null;
  for (let i = 0; i < stream.length; i++) {
    const pt = stream[i] || {};
    const prev = stream[i - 1] || {};
    if (i > 0) {
      const raw = Number(pt.time) - Number(prev.time);
      const dt = Number.isFinite(raw) ? Math.min(Math.max(raw, 0), 60) : 0;
      if (dt > 0) {
        total += dt;
        const hr = Number.isFinite(pt.heart_rate) && pt.heart_rate > 0 ? pt.heart_rate : lastHr;
        const hrr = heartRateReserve(hr, restHr, maxHr);
        if (hrr !== null) {
          trimp += (dt / 60) * hrr * a * Math.exp(b * hrr);
          covered += dt;
        }
      }
    }
    if (Number.isFinite(pt.heart_rate) && pt.heart_rate > 0) lastHr = pt.heart_rate;
  }
  return {
    trimp: Math.round(trimp * 100) / 100,
    covered_seconds: Math.round(covered),
    total_seconds: Math.round(total),
    coverage_pct: total > 0 ? Math.round((covered / total) * 100) : 0,
  };
}

// The single entry point every ingest path should use.
// Returns { session_trimp, load_source, load_coverage_pct } where load_source is:
//   'stream'  integrated from a verified per-second HR stream (measured)
//   'summary' Banister's average-HR equation (an estimate)
//   'none'    no heart rate at all, so no load
export function resolveSessionLoad({
  stream,
  durationSeconds,
  avgHr,
  restHr,
  maxHr,
  sex,
}: {
  stream?: any[];
  durationSeconds?: number;
  avgHr?: number | null;
  restHr?: number | null;
  maxHr?: number | null;
  sex?: string;
}) {
  // Do not silently manufacture resting HR or accept impossible HR ranges.
  // The legacy entity requires a numeric field. Zero with load_source='none'
  // is a storage sentinel for unavailable load, NOT evidence of zero exertion.
  const rest = restHr;
  const max = maxHr;
  const duration = durationSeconds;
  if (typeof rest !== 'number' || typeof max !== 'number' ||
      typeof duration !== 'number' || !Number.isFinite(rest) ||
      !Number.isFinite(max) || !Number.isFinite(duration) ||
      rest <= 0 || max <= rest || duration <= 0) {
    return { session_trimp: 0, load_source: 'none' as const, load_coverage_pct: 0 };
  }

  if (Array.isArray(stream) && stream.length >= 2 && isUsableTelemetry(stream, duration)) {
    const measured = integrateStreamTrimp(stream, rest, max, sex);
    const coversSession = duration <= 0 || measured.covered_seconds >= duration * MIN_STREAM_DURATION_FRACTION;
    if (measured.trimp > 0 && measured.coverage_pct >= MIN_STREAM_COVERAGE_PCT && coversSession) {
      return {
        session_trimp: measured.trimp,
        load_source: 'stream' as const,
        load_coverage_pct: measured.coverage_pct,
      };
    }
  }

  if (typeof avgHr !== 'number' || !Number.isFinite(avgHr) || avgHr < rest || avgHr > max) {
    return { session_trimp: 0, load_source: 'none' as const, load_coverage_pct: 0 };
  }
  const estimate = calcTrimp(duration / 60, avgHr, rest, max, sex);
  if (Number.isFinite(estimate) && estimate > 0) {
    return { session_trimp: estimate, load_source: 'summary' as const, load_coverage_pct: 0 };
  }
  return { session_trimp: 0, load_source: 'none' as const, load_coverage_pct: 0 };
}