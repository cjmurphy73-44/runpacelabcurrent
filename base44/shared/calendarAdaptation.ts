/**
 * Calendar-correct, read-only modelling of observed endurance load.
 *
 * This is a *scenario* using recorded session loads and zero impulses on
 * calendar days without a saved activity. Such days are NOT verified rest:
 * another device or an unsynced workout may be missing. Never use this module
 * to diagnose overtraining, assign injury risk, or automatically change plans.
 *
 * TRIMP and TSS are modelled as separate, non-interchangeable series. A sport
 * receives its own series so a mixed-sport week is not treated as one discipline.
 */
const DAY_MS = 86_400_000;
const MAX_DAYS = 365;
const CTL_TAU = 42;
const ATL_TAU = 7;

export type LoadUnit = 'trimp' | 'tss';
export interface RecordedLoadSession {
  id: string;
  date: string;
  sport?: string | null;
  session_trimp?: number | null;
  session_tss?: number | null;
  load_source?: string | null;
}
export interface DailyLoadModel {
  date: string;
  recorded_load: number;
  session_count: number;
  day_evidence: 'recorded_workout' | 'athlete_confirmed_rest' | 'unobserved';
  model_ctl: number;
  model_atl: number;
  model_tsb: number;
}
const validDay = (date: unknown): number | null => {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const t = Date.parse(date + 'T00:00:00Z');
  return Number.isFinite(t) && new Date(t).toISOString().slice(0, 10) === date ? t : null;
};
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const round = (value: number) => Number(value.toFixed(2));
const finitePositive = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value > 0;
function effectiveSport(sport: unknown): string {
  return typeof sport === 'string' && /^[a-z_]{1,48}$/.test(sport) ? sport : 'unclassified';
}

/** Returns one comparable load series, never a mix of load units or sports. */
export function modelCalendarLoad(
  sessions: readonly RecordedLoadSession[],
  referenceDate: string,
  options: {
    unit: LoadUnit;
    sport?: string | null;
    confirmedRestDates?: readonly string[];
    historyTruncated?: boolean;
    /** Explicit earliest date for complete connector coverage (if independently verified). */
    verifiedCoverageStart?: string | null;
    verifiedCoverageEnd?: string | null;
    days?: number;
  },
) {
  const reference = validDay(referenceDate);
  const days = options.days ?? 84;
  if (reference === null || !Array.isArray(sessions) || !['trimp', 'tss'].includes(options.unit) ||
      !Number.isInteger(days) || days < 7 || days > MAX_DAYS) {
    return { status: 'unavailable' as const, reason: 'invalid_input' as const };
  }
  const start = reference - (days - 1) * DAY_MS;
  const sport = options.sport ?? null;
  const selected = new Map<string, { date: string; load: number; origin: string }>();
  let invalidRecords = 0;
  for (const session of sessions) {
    if (!session || typeof session.id !== 'string' || !session.id) { invalidRecords++; continue; }
    const timestamp = validDay(session.date);
    if (timestamp === null || timestamp < start || timestamp > reference) continue;
    if (sport !== null && effectiveSport(session.sport) !== sport) continue;
    if (selected.has(session.id)) continue; // same provider session, not two efforts
    const raw = options.unit === 'trimp' ? session.session_trimp : session.session_tss;
    if (!finitePositive(raw)) { invalidRecords++; continue; }
    selected.set(session.id, {
      date: session.date, load: raw as number,
      origin: session.load_source === 'stream' ? 'stream' :
        session.load_source === 'summary' ? 'summary' : 'unclassified',
    });
  }
  const byDay = new Map<string, { load: number; count: number }>();
  const sourceCounts = { stream: 0, summary: 0, unclassified: 0 };
  for (const item of selected.values()) {
    const current = byDay.get(item.date) ?? { load: 0, count: 0 };
    current.load += item.load;
    current.count++;
    byDay.set(item.date, current);
    sourceCounts[item.origin as keyof typeof sourceCounts]++;
  }
  const rests = new Set((options.confirmedRestDates ?? [])
    .filter(d => { const ms = validDay(d); return ms !== null && ms >= start && ms <= reference; }));
  let ctl = 0;
  let atl = 0;
  let observed = 0;
  let presumedZero = 0;
  let confirmedRest = 0;
  const alphaCtl = 1 - Math.exp(-1 / CTL_TAU);
  const alphaAtl = 1 - Math.exp(-1 / ATL_TAU);
  const timeline: DailyLoadModel[] = [];
  for (let t = start; t <= reference; t += DAY_MS) {
    const day = iso(t);
    const stored = byDay.get(day);
    const evidence: DailyLoadModel['day_evidence'] = stored
      ? 'recorded_workout' : rests.has(day) ? 'athlete_confirmed_rest' : 'unobserved';
    if (stored) observed++;
    else if (evidence === 'athlete_confirmed_rest') confirmedRest++;
    else presumedZero++;
    const load = stored?.load ?? 0;
    ctl = ctl + alphaCtl * (load - ctl);
    atl = atl + alphaAtl * (load - atl);
    timeline.push({
      date: day, recorded_load: round(load), session_count: stored?.count ?? 0,
      day_evidence: evidence,
      model_ctl: round(ctl), model_atl: round(atl), model_tsb: round(ctl - atl),
    });
  }
  const coverageStart = validDay(options.verifiedCoverageStart);
  const coverageEnd = validDay(options.verifiedCoverageEnd);
  const allDaysCovered = coverageStart !== null && coverageStart <= start &&
    coverageEnd !== null && coverageEnd >= reference && options.historyTruncated !== true;
  const dataStatus = selected.size === 0 ? 'no_measured_load'
    : allDaysCovered ? 'complete_connector_window'
      : 'partial_observation_window';
  // All series are modelled; only an independently verified comprehensive
  // recording window is considered complete. A populated workout history alone
  // is not evidence that no other workouts took place on a blank date.
  // One imported workout cannot establish an individual load response. Even
  // seven distinct observed workout days only makes this an illustration.
  const mature = observed >= 7 && days >= CTL_TAU;
  const last = timeline[timeline.length - 1];
  const prior = timeline.length >= 8 ? timeline[timeline.length - 8] : null;
  return {
    status: 'available' as const,
    unit: options.unit, sport: sport ?? 'all_sports',
    assumption: 'unsaved_days_treated_as_zero_for_decay_only',
    data_status: dataStatus,
    model_status: mature ? 'illustrative_model' : 'insufficient_window',
    reference_date: referenceDate,
    window_days: days,
    completeness: {
      saved_workout_days: observed,
      athlete_confirmed_rest_days: confirmedRest,
      unobserved_days: presumedZero,
      included_sessions: selected.size,
      excluded_unusable_records: invalidRecords,
      ...sourceCounts,
      history_truncated: options.historyTruncated === true,
    },
    latest: {
      ctl: mature ? last.model_ctl : null,
      atl: mature ? last.model_atl : null,
      tsb: mature ? last.model_tsb : null,
      ctl_change_7d: mature && prior ? round(last.model_ctl - prior.model_ctl) : null,
    },
    timeline,
    caveats: [
      'Model values use the same response constants for everyone; they do not prove individual adaptation.',
      'Unobserved days are assigned zero load to illustrate decay, not declared rest days.',
      'TRIMP and TSS series cannot be added or compared numerically without calibration.',
      'No injury or overtraining probability can be inferred from modelled CTL, ATL, TSB or ACWR.',
    ],
  };
}

/** Small, safe coaching payload: one method per sport; no personal data or writes. */
export function summarizeCalendarResponse(sessions: readonly RecordedLoadSession[], referenceDate: string,
  options: { historyTruncated?: boolean; confirmedRestDates?: readonly string[];
    verifiedCoverageStart?: string | null; verifiedCoverageEnd?: string | null } = {},
) {
  const eligibleSports = new Set<string>();
  for (const row of sessions ?? []) {
    if (row && (finitePositive(row.session_trimp) || finitePositive(row.session_tss))) {
      eligibleSports.add(effectiveSport(row.sport));
    }
  }
  const samples = [...eligibleSports].sort().slice(0, 23);
  const models = samples.flatMap(sport => (['trimp', 'tss'] as const).map(unit =>
    modelCalendarLoad(sessions, referenceDate, { ...options, sport, unit, days: 84 })))
    .filter(m => m.status === 'available' && m.completeness.included_sessions > 0);
  return {
    state: 'observational_only' as const,
    reference_date: referenceDate,
    model_count: models.length,
    sport_load_models: models.map(m => ({
      sport: m.sport, unit: m.unit, model_status: m.model_status,
      data_status: m.data_status, latest: m.latest, completeness: m.completeness,
    })),
    limits: 'Modelled CTL/ATL is not observed fitness, recovery, performance response or a medical risk estimate.',
  };
}
