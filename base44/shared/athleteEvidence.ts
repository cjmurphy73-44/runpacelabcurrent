// Read-only, deterministic evidence layer for athlete understanding.
// Calendar days and load provenance stay explicit; this does not predict injury,
// infer unrecorded rest, diagnose health issues, or prescribe training.
const DAY_MS = 86_400_000;
const MAX_DAYS = 90;
const MIN_BASELINE_DAYS = 7;
const NUMERIC_FLOORS = { hrv: 2, resting_hr: 2, sleep_duration_hours: 0.5 };
const RECOVERY_FIELDS = ['hrv', 'resting_hr', 'sleep_duration_hours'] as const;
type RecoveryField = typeof RECOVERY_FIELDS[number];
type Metric = { value: number; baseline: number; samples: number; direction: string; threshold: number };
function utcDay(value: unknown): number | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const stamp = Date.parse(value + 'T00:00:00.000Z');
  return Number.isFinite(stamp) && new Date(stamp).toISOString().slice(0, 10) === value ? stamp : null;
}
const num = (v: unknown): number | null => typeof v === 'number' && Number.isFinite(v) ? v : null;
const round = (v: number, places = 1) => Number(v.toFixed(places));
function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  return n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
}
function recoveryValue(row: any, field: RecoveryField): number | null {
  const v = num(row?.[field]);
  if (v === null) return null;
  if (field === 'hrv') return v > 0 && v <= 500 ? v : null;
  if (field === 'resting_hr') return v >= 25 && v <= 180 ? v : null;
  return v > 0 && v <= 24 ? v : null;
}
function rateMetric(today: number, earlier: number[]): Metric | null {
  if (earlier.length < MIN_BASELINE_DAYS) return null;
  const base = median(earlier);
  const mad = median(earlier.map(v => Math.abs(v - base)));
  // Baseline variability and practical resolution both matter. This is a
  // descriptive signal, NOT a statistical disease or performance classifier.
  return { value: today, baseline: round(base, 2), samples: earlier.length,
    threshold: round(Math.max(2 * 1.4826 * mad, 0.001), 2), direction: 'near' };
}
export function evidenceAwareAthleteContext(
  sessions: unknown, recovery: unknown, referenceDate: string,
  options: { historyTruncated?: boolean; recoveryUnavailable?: boolean } = {},
) {
  const now = utcDay(referenceDate);
  if (now === null || !Array.isArray(sessions)) {
    return { state: 'unavailable', reason: 'invalid_date_or_history' };
  }
  const beginning = now - 27 * DAY_MS;
  const seen = new Set<string>();
  const weeks = [ { workouts: 0, minutes: 0 }, { workouts: 0, minutes: 0 } ];
  const sports: Record<string, { sessions: number; minutes: number }> = {};
  const loads = { trimp: { sessions: 0, total: 0, stream: 0, estimated: 0, unspecified: 0 },
    tss: { sessions: 0, total: 0, stream: 0, estimated: 0, unspecified: 0 },
    unknown: 0 };
  const activeDates = new Set<string>();
  let skippedIncomplete = 0;
  for (const row of sessions) {
    if (!row || typeof row !== 'object') continue;
    const day = utcDay(row.date);
    if (day === null || day < beginning || day > now) continue;
    if (typeof row.id !== 'string' || !row.id || seen.has(row.id)) continue;
    seen.add(row.id);
    const duration = num(row.duration_seconds) !== null && row.duration_seconds >= 0
      ? row.duration_seconds / 60 : num(row.duration_minutes);
    if (duration === null || duration < 0 || duration > 1440) {
      skippedIncomplete++;
      continue;
    }
    activeDates.add(row.date);
    const week = now - day < 7 * DAY_MS ? 0 : now - day < 14 * DAY_MS ? 1 : -1;
    if (week >= 0) {
      weeks[week].workouts++;
      weeks[week].minutes += duration;
    }
    const sport = typeof row.sport === 'string' && /^[a-z_]{1,48}$/.test(row.sport) ? row.sport : 'unclassified';
    if (!sports[sport]) sports[sport] = { sessions: 0, minutes: 0 };
    sports[sport].sessions++;
    sports[sport].minutes += duration;
    // Distinct load systems have different scales. Never sum TSS with TRIMP.
    const trimp = num(row.session_trimp);
    const tss = num(row.session_tss);
    if (!(trimp !== null && trimp > 0) && !(tss !== null && tss > 0)) {
      loads.unknown++;
      continue;
    }
    const origin: 'stream' | 'estimated' | 'unspecified' = row.load_source === 'stream'
      ? 'stream' : row.load_source === 'summary' ? 'estimated' : 'unspecified';
    // One session may legitimately carry both TRIMP and TSS; show both in
    // their OWN units, never add them together or silently discard either.
    if (trimp !== null && trimp > 0) {
      loads.trimp.sessions++;
      loads.trimp.total += trimp;
      loads.trimp[origin]++;
    }
    if (tss !== null && tss > 0) {
      loads.tss.sessions++;
      loads.tss.total += tss;
      loads.tss[origin]++;
    }
  }
  const recoveryReport: Record<string, any> = {};
  if (options.recoveryUnavailable || !Array.isArray(recovery)) {
    for (const f of RECOVERY_FIELDS) recoveryReport[f] = { state: 'unavailable' };
  } else {
    // Only prior dated readings establish a baseline; never include the
    // observation being assessed. One sample per calendar day.
    const dated = recovery.filter(r => r && utcDay(r.date) !== null &&
      utcDay(r.date)! >= now - MAX_DAYS * DAY_MS && utcDay(r.date)! <= now)
      .sort((a, b) => b.date.localeCompare(a.date));
    const latest = dated.find(row => utcDay(row.date)! >= now - DAY_MS) ?? null;
    for (const field of RECOVERY_FIELDS) {
      const measured = recoveryValue(latest, field);
      if (measured === null) {
        recoveryReport[field] = { state: 'missing_recent_measurement' };
        continue;
      }
      const before = new Map<string, number>();
      for (const row of dated) {
        if (row.date >= latest.date || before.has(row.date)) continue;
        const v = recoveryValue(row, field);
        if (v !== null) before.set(row.date, v);
        if (before.size >= 28) break;
      }
      const values = [...before.values()];
      const result = rateMetric(measured, values);
      if (!result) {
        recoveryReport[field] = { state: 'insufficient_personal_baseline', value: measured,
          baseline_days: values.length, required_days: MIN_BASELINE_DAYS };
        continue;
      }
      const floor = NUMERIC_FLOORS[field];
      result.threshold = round(Math.max(result.threshold, floor), 2);
      const difference = measured - result.baseline;
      result.direction = Math.abs(difference) < result.threshold ? 'within_usual_variation'
        : difference > 0 ? 'above_recent_baseline' : 'below_recent_baseline';
      recoveryReport[field] = { state: 'descriptive_only', observed_on: latest.date, ...result };
    }
  }
  const types = ['trimp', 'tss'] as const;
  for (const t of types) loads[t].total = round(loads[t].total);
  const bySport = Object.fromEntries(Object.entries(sports).map(([sport, value]) =>
    [sport, { sessions: value.sessions, minutes: round(value.minutes) }]));
  const prior = weeks[1].workouts ? { workouts: weeks[1].workouts, minutes: round(weeks[1].minutes) } : null;
  const caveats = [
    'Calendar days without saved workouts are unobserved, not verified rest days.',
    'Training load units are separated by method; TSS and TRIMP are not interchangeable.',
    'Personal recovery differences describe observations, not injury risk or training clearance.',
  ];
  if (options.historyTruncated) caveats.push('Workout history was truncated; comparisons may omit earlier sessions.');
  if (skippedIncomplete) caveats.push('Some workouts lacked usable duration and were excluded from duration summaries.');
  return {
    state: 'available', schema_version: 1, as_of: referenceDate,
    session_coverage: { recent_days: 28, days_with_saved_workouts: activeDates.size,
      days_without_saved_workouts: 28 - activeDates.size, discarded_incomplete_sessions: skippedIncomplete,
      history_truncated: options.historyTruncated === true },
    recent_week: { workouts: weeks[0].workouts, minutes: round(weeks[0].minutes) },
    previous_week: prior,
    recorded_sports: bySport,
    load_by_unit: loads,
    recovery: recoveryReport,
    confidence: options.historyTruncated ? 'incomplete_history'
      : seen.size === 0 ? 'no_recent_workouts'
      : 'observational_only',
    caveats,
  };
}
