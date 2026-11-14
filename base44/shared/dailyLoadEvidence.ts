/**
 * Conservative daily load evidence gate. A stored numeric zero is not proof of
 * rest: it may be the legacy sentinel for an unavailable session load.
 * TRIMP and TSS are different units and cannot be silently added.
 */
export type LoadSession = {
  date?: string;
  session_trimp?: number | null;
  session_tss?: number | null;
  load_source?: string | null;
};
export type DailyLoadEvidence = {
  date: string;
  confirmed_rest?: boolean | null;
};
export type DailyLoadAssessment = {
  eligible: boolean;
  load: number | null;
  unit: 'trimp' | 'tss' | null;
  reason: string | null;
  source: 'session' | 'confirmed_rest' | 'unknown';
};

export function assessDailyLoad(
  sessions: LoadSession[],
  restConfirmed = false,
): DailyLoadAssessment {
  if (!Array.isArray(sessions)) return { eligible: false, load: null, unit: null, reason: 'invalid_sessions', source: 'unknown' };
  if (sessions.length === 0) {
    return restConfirmed
      ? { eligible: true, load: 0, unit: null, reason: null, source: 'confirmed_rest' }
      : { eligible: false, load: null, unit: null, reason: 'unverified_rest_day', source: 'unknown' };
  }
  if (restConfirmed) return { eligible: false, load: null, unit: null, reason: 'rest_conflicts_with_session', source: 'unknown' };
  let total = 0;
  let unit: 'trimp' | 'tss' | null = null;
  for (const session of sessions) {
    const trimp = session?.session_trimp;
    const tss = session?.session_tss;
    if ((trimp != null && (!Number.isFinite(trimp) || trimp < 0)) ||
        (tss != null && (!Number.isFinite(tss) || tss < 0))) {
      return { eligible: false, load: null, unit: null, reason: 'invalid_load', source: 'unknown' };
    }
    if (session.load_source === 'none') {
      return { eligible: false, load: null, unit: null, reason: 'unavailable_session_load', source: 'unknown' };
    }
    const nextUnit = typeof trimp === 'number' && trimp > 0 ? 'trimp'
      : typeof tss === 'number' && tss > 0 ? 'tss' : null;
    if (!nextUnit) return { eligible: false, load: null, unit: null, reason: 'unavailable_session_load', source: 'unknown' };
    if (unit && unit !== nextUnit) return { eligible: false, load: null, unit: null, reason: 'mixed_load_units', source: 'unknown' };
    unit = nextUnit;
    total += nextUnit === 'trimp' ? trimp! : tss!;
  }
  return { eligible: true, load: Math.round(total * 100) / 100, unit, reason: null, source: 'session' };
}

export function auditDailyHistory(
  sessions: LoadSession[],
  days: DailyLoadEvidence[],
  today: string,
): { eligible: boolean; reason: string | null; date: string | null; unit: 'trimp' | 'tss' | null } {
  if (!Array.isArray(sessions) || !Array.isArray(days) || !/^\d{4}-\d{2}-\d{2}$/.test(today)) {
    return { eligible: false, reason: 'invalid_history', date: null, unit: null };
  }
  const dates = [...sessions.map((s) => s.date), ...days.filter((d) => d.confirmed_rest === true).map((d) => d.date)]
    .filter((d): d is string => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort();
  if (!dates.length) return { eligible: false, reason: 'no_verified_history', date: null, unit: null };
  const start = Date.parse(dates[0] + 'T00:00:00Z');
  const end = Date.parse(today + 'T00:00:00Z');
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || end - start > 3660 * 86400000) {
    return { eligible: false, reason: 'invalid_history_range', date: null, unit: null };
  }
  const restDays = new Set(days.filter((d) => d.confirmed_rest === true).map((d) => d.date));
  let unit: 'trimp' | 'tss' | null = null;
  for (let ms = start; ms <= end; ms += 86400000) {
    const date = new Date(ms).toISOString().slice(0, 10);
    const assessment = assessDailyLoad(sessions.filter((s) => s.date === date), restDays.has(date));
    if (!assessment.eligible) return { eligible: false, reason: assessment.reason, date, unit: null };
    if (assessment.unit) {
      if (unit && unit !== assessment.unit) return { eligible: false, reason: 'mixed_load_units', date, unit: null };
      unit = assessment.unit;
    }
  }
  return { eligible: true, reason: null, date: null, unit };
}
