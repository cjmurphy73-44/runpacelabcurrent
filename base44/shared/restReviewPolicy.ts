/** Read-only historical rest review policy. Does not authorize writes. */
export type RestReviewRequest = {
  athlete_id?: unknown;
  action?: unknown;
  start_date?: unknown;
  end_date?: unknown;
  date?: unknown;
  confirm_rest?: unknown;
};
const ISO = /^\d{4}-\d{2}-\d{2}$/;
export function isRealUtcDate(value: unknown): value is string {
  if (typeof value !== 'string' || !ISO.test(value)) return false;
  const ms = Date.parse(value + 'T00:00:00Z');
  return Number.isFinite(ms) && new Date(ms).toISOString().slice(0, 10) === value;
}
export function classifyRestReviewRequest(body: RestReviewRequest, todayUtc: string) {
  if (!body || !isRealUtcDate(todayUtc)) return { ok: false as const, status: 400, code: 'INVALID_REQUEST' };
  if (body.action !== 'preview' && body.action !== 'confirm_rest') {
    return { ok: false as const, status: 400, code: 'UNSUPPORTED_ACTION' };
  }
  // Never read or write history for a rest confirmation until atomic
  // uniqueness across WorkoutSession and DailyMetrics is established.
  if (body.action === 'confirm_rest') {
    return { ok: false as const, status: 409, code: 'ATOMIC_REST_CONFIRMATION_UNAVAILABLE' };
  }
  const start = body.start_date;
  const end = body.end_date;
  if (!isRealUtcDate(start) || !isRealUtcDate(end) || start > end || end >= todayUtc ||
      Date.parse(end + 'T00:00:00Z') - Date.parse(start + 'T00:00:00Z') > 30 * 86400000) {
    return { ok: false as const, status: 400, code: 'INVALID_DATE_RANGE' };
  }
  return { ok: true as const, start, end };
}
