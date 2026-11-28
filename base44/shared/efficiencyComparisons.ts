/**
 * Matched-effort descriptive comparisons, not physiological diagnosis.
 * Similar recorded HR and duration are only partial comparability controls:
 * terrain, temperature, fatigue, pauses, assistive motors and devices can
 * materially influence the observed pace/power. Never turn the result into
 * a predicted race time, personal VO2max, or an automatic training adjustment.
 */
const DAY_MS = 86_400_000;
const SUPPORTED = new Set(['running', 'walking', 'cycling']);
const dateMs = (s: unknown) => {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const ms = Date.parse(s + 'T00:00:00Z');
  return Number.isFinite(ms) && new Date(ms).toISOString().slice(0, 10) === s ? ms : null;
};
const measured = (v: unknown) => typeof v === 'number' && Number.isFinite(v) ? v : null;
const median = (nums: number[]) => {
  const sorted = [...nums].sort((a,b) => a-b);
  const mid = Math.floor(sorted.length/2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid-1] + sorted[mid]) / 2;
};
const rounded = (v: number) => Number(v.toFixed(2));

export interface ComparableSession {
  id: string;
  date: string;
  sport?: string | null;
  duration_minutes?: number | null;
  duration_seconds?: number | null;
  distance_km?: number | null;
  avg_hr?: number | null;
  avg_power?: number | null;
  load_source?: string | null;
  /** Verified HR stream coverage of session duration, from ingestion. */
  load_coverage_pct?: number | null;
}

export function compareMatchedEffort(
  history: readonly ComparableSession[],
  referenceDay: string,
  sport: string,
) {
  const now = dateMs(referenceDay);
  if (now === null || !Array.isArray(history)) return { state: 'unavailable' as const, reason: 'invalid_input' };
  if (!SUPPORTED.has(sport)) return {
    state: 'not_comparable' as const, sport,
    reason: 'no_validated_cross_session_metric_for_this_sport',
  };
  const metric = sport === 'cycling' ? 'average_power_watts' : 'average_speed_mps';
  const seen = new Set<string>();
  const candidates: { date: string; age: number; hr: number; minutes: number; metric: number }[] = [];
  for (const row of history) {
    // 'stream' alone is not adequate evidence: averages can be biased by
    // sparse HR samples. Require ingester-verified HR duration coverage.
    // Missing coverage is unknown, never silently assumed complete.
    if (!row || row.sport !== sport || row.load_source !== 'stream' ||
        measured(row.load_coverage_pct) === null ||
        row.load_coverage_pct! < 80 || row.load_coverage_pct! > 100 ||
        typeof row.id !== 'string' || !row.id || seen.has(row.id)) continue;
    seen.add(row.id);
    const t = dateMs(row.date);
    if (t === null || t > now || t < now - 56 * DAY_MS) continue;
    const minutes = measured(row.duration_seconds) !== null && row.duration_seconds! > 0
      ? row.duration_seconds! / 60 : measured(row.duration_minutes);
    const hr = measured(row.avg_hr);
    if (minutes === null || minutes < 20 || minutes > 240 || hr === null || hr < 90 || hr > 195) continue;
    const value = sport === 'cycling' ? measured(row.avg_power) : (
      measured(row.distance_km) !== null && row.distance_km! > 0
        ? row.distance_km! * 1000 / (minutes * 60) : null);
    if (value === null || (sport === 'cycling' ? value < 50 || value > 900 : value < 1 || value > 8)) continue;
    candidates.push({ date: row.date, age: (now - t) / DAY_MS, hr, minutes, metric: value });
  }
  // Non-overlapping windows keep a minimum 7-day separation between groups.
  const older = candidates.filter(c => c.age >= 28 && c.age <= 56);
  const recent = candidates.filter(c => c.age >= 0 && c.age <= 21);
  if (older.length < 3 || recent.length < 3) return {
    state: 'insufficient_comparable_sessions' as const, sport, metric,
    older_candidates: older.length, recent_candidates: recent.length,
    required_per_window: 3,
  };
  const anchorHr = median(older.map(r => r.hr));
  const anchorDuration = median(older.map(r => r.minutes));
  const matches = (x: typeof candidates[number]) =>
    Math.abs(x.hr - anchorHr) <= 5 && Math.abs(x.minutes - anchorDuration) <= Math.max(5, anchorDuration * 0.2);
  const matchedOlder = older.filter(matches);
  const matchedRecent = recent.filter(matches);
  // Three workouts on one day are not three independent observations of
  // adaptation. Require repeatability across dates in both time windows.
  const olderDates = new Set(matchedOlder.map(r => r.date)).size;
  const recentDates = new Set(matchedRecent.map(r => r.date)).size;
  if (matchedOlder.length < 3 || matchedRecent.length < 3 ||
      olderDates < 3 || recentDates < 3) return {
    state: 'insufficient_comparable_sessions' as const, sport, metric,
    older_candidates: matchedOlder.length, recent_candidates: matchedRecent.length,
    older_distinct_days: olderDates, recent_distinct_days: recentDates,
    required_per_window: 3, required_distinct_days_per_window: 3,
    matching: 'within_5_bpm_and_20_percent_duration',
  };
  const olderMedian = median(matchedOlder.map(r => r.metric));
  const recentMedian = median(matchedRecent.map(r => r.metric));
  return {
    state: 'descriptive_only' as const, sport, metric,
    reference_day: referenceDay,
    matching: { average_hr_bpm: rounded(anchorHr), duration_minutes: rounded(anchorDuration),
      hr_tolerance_bpm: 5, duration_tolerance_percent: 20 },
    older: { sessions: matchedOlder.length, distinct_days: olderDates,
      median_metric: rounded(olderMedian), age_days: '28_to_56' },
    recent: { sessions: matchedRecent.length, distinct_days: recentDates,
      median_metric: rounded(recentMedian), age_days: '0_to_21' },
    relative_change_percent: rounded((recentMedian / olderMedian - 1) * 100),
    uncertainty: [
      'Association only; this does not establish adaptation or causal improvement.',
      'Terrain, environmental conditions, sensor error, session structure and fatigue were not controlled.',
      'Requires at least 80% ingestion-reported HR stream coverage per session; this still does not prove equivalent sensor accuracy.',
      'Repeated observations on distinct dates are required; incomplete provider history can still bias comparisons.',
    ],
  };
}
