// base44/shared/physiology.ts
// Physiological metric derivation shared by the ingestion pipeline and the
// multi-asset reconciliation engine so both compute Efficiency Factor, aerobic
// decoupling, and TRIMP/rTSS identically. Plain module — no Deno.serve.
// Import from a function entry via:
//   import { calcTrimp, computeNgpSeries, computeDecouplingAndEF, calcRTSS } from '../../shared/physiology.ts';

const WARMUP_SECONDS = 300;
const MIN_DECOUPLING_DURATION_MIN = 45;

export function average(values) {
  const valid = values.filter((v) => typeof v === 'number' && !isNaN(v));
  if (valid.length === 0) return null;
  return valid.reduce((s, v) => s + v, 0) / valid.length;
}

export function calcTrimp(durationMin, avgHr, restHr, maxHr, sex) {
  if (!durationMin || !avgHr || !maxHr || maxHr <= restHr) return 0;
  const hrr = Math.max(0, Math.min(1, (avgHr - restHr) / (maxHr - restHr)));
  const isFemale = sex === 'female';
  const a = isFemale ? 0.86 : 0.64;
  const b = isFemale ? 1.67 : 1.92;
  return Math.round(durationMin * hrr * a * Math.exp(b * hrr) * 100) / 100;
}

// Minetti metabolic cost formula: scales raw speed to a flat-land-equivalent Normalized Graded Pace.
export function gradeCostFactor(grade) {
  const s = Math.max(-0.45, Math.min(0.45, grade));
  const cf = 1 + 19 * s + 50.4 * s * s - 128.2 * s * s * s;
  return Math.max(0.5, Math.min(3, cf));
}

// Builds a { time, ngp, hr } series from a raw telemetry stream using altitude/distance deltas.
export function computeNgpSeries(stream) {
  const series = [];
  for (let i = 1; i < stream.length; i++) {
    const prev = stream[i - 1];
    const cur = stream[i];
    const dTime = cur.time - prev.time;
    const dDist = (cur.distance ?? null) !== null && (prev.distance ?? null) !== null ? cur.distance - prev.distance : null;
    if (!dTime || dTime <= 0 || dDist === null || dDist <= 0) continue;
    const speed = cur.speed ?? (dDist / dTime);
    const dAlt = (cur.altitude ?? null) !== null && (prev.altitude ?? null) !== null ? cur.altitude - prev.altitude : 0;
    const grade = dDist > 0 ? dAlt / dDist : 0;
    const ngp = speed * gradeCostFactor(grade);
    series.push({ time: cur.time, ngp, hr: cur.heart_rate ?? null });
  }
  return series;
}

// Aerobic Decoupling (Pa:HR) + overall Efficiency Factor from an NGP (or power) series.
export function computeDecouplingAndEF(ngpSeries, durationMinutes, avgHrFallback) {
  const overallEF = (() => {
    const avgNgp = average(ngpSeries.map((p) => p.ngp));
    const avgHr = average(ngpSeries.map((p) => p.hr)) ?? avgHrFallback;
    if (!avgNgp || !avgHr) return null;
    return Math.round((avgNgp / avgHr) * 10000) / 10000;
  })();

  if (durationMinutes < MIN_DECOUPLING_DURATION_MIN) {
    return { aerobic_decoupling: null, efficiency_factor: overallEF, avg_ngp: average(ngpSeries.map((p) => p.ngp)) };
  }

  const active = ngpSeries.filter((p) => p.time > WARMUP_SECONDS && p.hr);
  if (active.length < 10) {
    return { aerobic_decoupling: null, efficiency_factor: overallEF, avg_ngp: average(ngpSeries.map((p) => p.ngp)) };
  }

  const mid = Math.floor(active.length / 2);
  const half1 = active.slice(0, mid);
  const half2 = active.slice(mid);
  const ef1 = average(half1.map((p) => p.ngp)) / average(half1.map((p) => p.hr));
  const ef2 = average(half2.map((p) => p.ngp)) / average(half2.map((p) => p.hr));
  const decoupling = ef1 ? Math.round(((ef1 - ef2) / ef1) * 10000) / 100 : null;

  return { aerobic_decoupling: decoupling, efficiency_factor: overallEF, avg_ngp: average(ngpSeries.map((p) => p.ngp)) };
}

// rTSS fallback (GPS/pace-based) when heart rate is unavailable.
export function calcRTSS(durationSeconds, avgNgp, ftPaceMs) {
  if (!durationSeconds || !avgNgp || !ftPaceMs) return 0;
  const intensityFactor = avgNgp / ftPaceMs;
  const rtss = (durationSeconds * avgNgp * intensityFactor) / (ftPaceMs * 3600) * 100;
  return Math.round(rtss * 100) / 100;
}

export { WARMUP_SECONDS, MIN_DECOUPLING_DURATION_MIN };