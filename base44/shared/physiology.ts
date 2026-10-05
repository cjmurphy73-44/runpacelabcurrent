export function calculateVDOTScore(timeSeconds: number, distanceMeters: number): number {
  const t = timeSeconds / 60;
  const velocity = distanceMeters / t;
  const percentMax = 0.8 + 0.1894393 * Math.exp(-0.012778 * t) + 0.2989558 * Math.exp(-0.1932605 * t);
  const vo2 = -4.60 + 0.182258 * velocity + 0.000104 * Math.pow(velocity, 2);
  const vdot = vo2 / percentMax;
  return Math.round(vdot * 10) / 10;
}

export function calculateThresholdPace(vdot: number): { thresholdSecondsPerKm: number } {
  const speedMetersPerMin = 29.54 + 5.000663 * vdot - 0.007546 * Math.pow(vdot, 2);
  const secondsPerKm = (1000 / speedMetersPerMin) * 60;
  return { thresholdSecondsPerKm: Math.round(secondsPerKm) };
}

export function calculateMinettiGradePace(basePaceSecondsPerKm: number, gradePercent: number): number {
  const g = gradePercent / 100;
  const costMultiplier = 155.4 * Math.pow(g, 5) - 30.4 * Math.pow(g, 4) - 43.3 * Math.pow(g, 3) + 46.3 * Math.pow(g, 2) + 19.5 * g + 1.0;
  return Math.round(basePaceSecondsPerKm * Math.max(0.5, 1 / costMultiplier));
}

// Banister HR-based TRIMP. Re-exported here so ingestWorkoutFile/streamReconcile
// can import all physiology helpers from one module.
export function calcTrimp(durationMin: number, avgHr: number, restHr: number, maxHr: number, sex?: string): number {
  if (!durationMin || !avgHr || !maxHr || maxHr <= restHr) return 0;
  const hrr = Math.max(0, Math.min(1, (avgHr - restHr) / (maxHr - restHr)));
  const isFemale = sex === 'female';
  const a = isFemale ? 0.86 : 0.64;
  const b = isFemale ? 1.67 : 1.92;
  return Math.round(durationMin * hrr * a * Math.exp(b * hrr) * 100) / 100;
}

const WARMUP_SECONDS = 300;
const MIN_DECOUPLING_DURATION_MIN = 45;

function averageValues(values: (number | null | undefined)[]): number | null {
  const valid = values.filter((v): v is number => typeof v === 'number' && !isNaN(v));
  if (valid.length === 0) return null;
  return valid.reduce((s, v) => s + v, 0) / valid.length;
}

function gradeCostFactor(grade: number): number {
  const s = Math.max(-0.45, Math.min(0.45, grade));
  const cf = 1 + 19 * s + 50.4 * s * s - 128.2 * s * s * s;
  return Math.max(0.5, Math.min(3, cf));
}

export interface StreamPoint {
  time: number;
  ngp: number;
  hr: number | null;
}

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

export function computeDecouplingAndEF(
  ngpSeries: StreamPoint[],
  durationMinutes: number,
  avgHrFallback?: number,
): { aerobic_decoupling: number | null; efficiency_factor: number | null; avg_ngp: number | null } {
  const avgNgp = averageValues(ngpSeries.map((p) => p.ngp));
  const avgHr = averageValues(ngpSeries.map((p) => p.hr)) ?? avgHrFallback ?? null;
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
  const ef1 = (averageValues(half1.map((p) => p.ngp)) as number) / (averageValues(half1.map((p) => p.hr)) as number);
  const ef2 = (averageValues(half2.map((p) => p.ngp)) as number) / (averageValues(half2.map((p) => p.hr)) as number);
  const decoupling = ef1 ? Math.round(((ef1 - ef2) / ef1) * 10000) / 100 : null;
  return { aerobic_decoupling: decoupling, efficiency_factor: overallEF, avg_ngp: avgNgp };
}

export function calcRTSS(durationSeconds: number, avgNgp: number, ftPaceMs: number): number {
  if (!durationSeconds || !avgNgp || !ftPaceMs) return 0;
  const intensityFactor = avgNgp / ftPaceMs;
  const rtss = (durationSeconds * avgNgp * intensityFactor) / (ftPaceMs * 3600) * 100;
  return Math.round(rtss * 100) / 100;
}