// @ts-expect-error Base44 Deno bundler requires an explicit .ts extension; frontend tsc disallows it.
import { assessDailyLoad, type LoadSession } from './dailyLoadEvidence.ts';

export type RestReviewDay = {
  date: string;
  status: 'recorded' | 'confirmed_rest' | 'unknown' | 'incomplete_load' | 'conflict';
  session_count: number;
  reason: string | null;
};

/**
 * A successful provider sync is not evidence that an individual day was rest.
 * Only an athlete's explicit confirmation may create a rest marker.
 */
export function buildRestReview(
  sessions: LoadSession[],
  metrics: { date: string; confirmed_rest?: boolean | null }[],
  startDate: string,
  endDate: string,
): RestReviewDay[] {
  const parse = (date: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
    const ms = Date.parse(date + 'T00:00:00Z');
    return Number.isFinite(ms) && new Date(ms).toISOString().slice(0, 10) === date ? ms : null;
  };
  const start = parse(startDate);
  const end = parse(endDate);
  if (start === null || end === null || end < start || end - start > 30 * 86400000 ||
      !Array.isArray(sessions) || !Array.isArray(metrics)) throw new Error('invalid_review_window');
  const sessionDays = new Map<string, LoadSession[]>();
  for (const session of sessions) {
    if (!session.date) continue;
    sessionDays.set(session.date, [...(sessionDays.get(session.date) || []), session]);
  }
  const rest = new Set(metrics.filter((m) => m.confirmed_rest === true).map((m) => m.date));
  const result: RestReviewDay[] = [];
  for (let ms = start; ms <= end; ms += 86400000) {
    const date = new Date(ms).toISOString().slice(0, 10);
    const daySessions = sessionDays.get(date) || [];
    const assessment = assessDailyLoad(daySessions, rest.has(date));
    const status = assessment.eligible
      ? assessment.source === 'confirmed_rest' ? 'confirmed_rest' : 'recorded'
      : assessment.reason === 'rest_conflicts_with_session' ? 'conflict'
      : daySessions.length ? 'incomplete_load' : 'unknown';
    result.push({ date, status, session_count: daySessions.length, reason: assessment.reason });
  }
  return result;
}

export function canConfirmRest(day: RestReviewDay, confirmation: boolean): boolean {
  return confirmation === true && day.status === 'unknown' && day.session_count === 0;
}
