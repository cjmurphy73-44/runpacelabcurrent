// src/science/grade.ts
// Minetti grade-adjusted pace (GAP), Normalized Graded Pace (NGP) series,
// aerobic decoupling (Pa:HR), and Efficiency Factor (EF). Pure functions.
//
// Sources:
//  - Minetti, L.R.E. et al. 2002. "Energy cost of level and uphill running in
//    endurance athletes." J Exp Biol 205:959–971. Energy cost C(g):
//      C(g) = 155.4g⁵ − 30.4g⁴ − 43.3g³ + 46.3g² + 19.5g + 3.6  [J/(kg·m)]
//  - Skiba, A. "Efficiency Factor & Aerobic Decoupling" (TrainingPeaks).
//
// Limitations:
//  - Downhill benefit clamps at −12% grade; steeper descents are dominated by
//    eccentric braking and no longer increase speed.
//  - Aerobic decoupling (Pa:HR) is only meaningful for aerobic runs > 45 min;
//    shorter sessions return null.

const WARMUP_SECONDS = 300;
const MIN_DECOUPLING_DURATION_MIN = 45;

export function average(values: (number | null | undefined)[]): number | null {
  const valid = values.filter((v): v is number => typeof v === 'number' && !isNaN(v));
  if (valid.length === 0) return null;
  return valid.reduce((s, v) => s + v, 0) / valid.length;
}

/** Minetti energy cost of running C(g) in J/(kg·m). */
export function minettiCost(g: number): number {
  const g2 = g * g, g3 = g2 * g, g4 = g3 * g, g5 = g4 * g;
  return 155.4 * g5 - 30.4 * g4 - 43.3 * g3 + 46.3 * g2 + 19.5 * g + 3.6;
}

const FLAT_COST = minettiCost(0); // 3.6 J/(kg·m)

/** Pace factor vs flat (>1 slower, <1 faster). Downhill braking clamped at −12%. */
export function gradeAdjustedPaceFactor(grade: number): number {
  const g = Math.max(grade, -0.12);
  return minettiCost(g) / FLAT_COST;
}

/** Apply grade factor to a flat pace (sec/km) → grade-adjusted pace (sec/km). */
export function gradeAdjustedPace(flatPaceSecPerKm: number, grade: number): number {
  return flatPaceSecPerKm * gradeAdjustedPaceFactor(grade);
}

/** Minetti metabolic cost multiplier (legacy clamp form used by ingestion pipeline). */
export function gradeCostFactor(grade: number): number {
  const s = Math.max(-0.45, Math.min(0.45, grade));
  const cf = 1 + 19 * s + 50.4 * s * s - 128.2 * s * s * s;
  return Math.max(0.5, Math.min(3, cf));
}

export interface StreamPoint {
  time: number;
  ngp: number;
  hr: number | null;
}

/** Build an { time, ngp, hr } series from a raw telemetry stream. */
export function computeNgpSeries(stream: Array<{
  time: number; distance?: number | null; speed?: number | null;
  altitude?: number | null; heart_rate?: number | null;
}>): StreamPoint[] {
  const series: StreamPoint[] = [];
  for (let i = 1; i < stream.length; i++) {
    const prev = stream[i - 1];
    const cur = stream[i];
    const dTime = cur.time - prev.time;
    const dDist = (cur.distance ?? null) !== null && (prev.distance ?? null) !== null ? (cur.distance as number) - (prev.distance as number) : null;
    if (!dTime || dTime <= 0 || dDist === null || dDist <= 0) continue;
    const speed = cur.speed ?? (dDist / dTime);
    const dAlt = (cur.altitude ?? null) !== null && (prev.altitude ?? null) !== null ? (cur.altitude as number) - (prev.altitude as number) : 0;
    const grade = dDist > 0 ? dAlt / dDist : 0;
    const ngp = speed * gradeCostFactor(grade);
    series.push({ time: cur.time, ngp, hr: cur.heart_rate ?? null });
  }
  return series;
}

/** Aerobic decoupling (%) + Efficiency Factor from an NGP/power series. */
export function computeDecouplingAndEF(
  ngpSeries: StreamPoint[],
  durationMinutes: number,
  avgHrFallback?: number,
): { aerobic_decoupling: number | null; efficiency_factor: number | null; avg_ngp: number | null } {
  const avgNgp = average(ngpSeries.map((p) => p.ngp));
  const avgHr = average(ngpSeries.map((p) => p.hr)) ?? avgHrFallback ?? null;
  const overallEF = avgNgp && avgHr ? Math.round((avgNgp / avgHr) * 10000) / 10000 : null;

  if (durationMinutes < MIN_DECOUPLING_DURATION_MIN) {
    return { aerobic_decoupling: null, efficiency_factor: overallEF, avg_ngp: avgNgp };
  }
  const active = ngpSeries.filter((p) => p.time > WARMUP_SECONDS && p.hr);
  if (active.length < 10) {
    return { aerobic_decoupling: null, efficiency_factor: overallEF, avg_ngp: avgNgp };
  }
  const mid = Math.floor(active.length / 2);
  const half1 = active.slice(0, mid);
  const half2 = active.slice(mid);
  const ef1 = (average(half1.map((p) => p.ngp)) as number) / (average(half1.map((p) => p.hr)) as number);
  const ef2 = (average(half2.map((p) => p.ngp)) as number) / (average(half2.map((p) => p.hr)) as number);
  const decoupling = ef1 ? Math.round(((ef1 - ef2) / ef1) * 10000) / 100 : null;
  return { aerobic_decoupling: decoupling, efficiency_factor: overallEF, avg_ngp: avgNgp };
}

/** rTSS fallback (GPS/pace) when HR is unavailable. IF = avgNgp / ftPace. */
export function calcRTSS(durationSeconds: number, avgNgp: number, ftPaceMs: number): number {
  if (!durationSeconds || !avgNgp || !ftPaceMs) return 0;
  const intensityFactor = avgNgp / ftPaceMs;
  const rtss = (durationSeconds * avgNgp * intensityFactor) / (ftPaceMs * 3600) * 100;
  return Math.round(rtss * 100) / 100;
}

export { WARMUP_SECONDS, MIN_DECOUPLING_DURATION_MIN };