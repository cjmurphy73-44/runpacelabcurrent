import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { assertOwnsAthlete } from '../../shared/ownership.ts';
import { buildRestReview, canConfirmRest } from '../../shared/restDayReview.ts';

const MAX_ROWS_PER_DATE = 500;
const ISO = /^\d{4}-\d{2}-\d{2}$/;
function validDate(date: unknown): date is string {
  if (typeof date !== 'string' || !ISO.test(date)) return false;
  const time = Date.parse(date + 'T00:00:00Z');
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === date;
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { athlete_id, action, start_date, end_date, date, confirm_rest } = await req.json().catch(() => ({}));
    if (!athlete_id || !(await assertOwnsAthlete(base44, user, athlete_id))) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    const today = new Date().toISOString().slice(0, 10);
    const start = action === 'confirm_rest' ? date : start_date;
    const end = action === 'confirm_rest' ? date : end_date;
    if (!validDate(start) || !validDate(end) || start > end || end > today ||
        Date.parse(end + 'T00:00:00Z') - Date.parse(start + 'T00:00:00Z') > 30 * 86400000) {
      return Response.json({ error: 'Choose a valid past or present window of at most 31 days.' }, { status: 400 });
    }
    if (action !== 'preview' && action !== 'confirm_rest') {
      return Response.json({ error: 'Unsupported action' }, { status: 400 });
    }
    if (action === 'confirm_rest' && confirm_rest !== true) {
      return Response.json({ error: 'Explicit rest confirmation is required.' }, { status: 400 });
    }

    const sessions: any[] = [];
    const metrics: any[] = [];
    // Do not assume a capped provider query is complete. The current Base44
    // API has no demonstrated stable cursor for these entity filters.
    for (let ms = Date.parse(start + 'T00:00:00Z'); ms <= Date.parse(end + 'T00:00:00Z'); ms += 86400000) {
      const day = new Date(ms).toISOString().slice(0, 10);
      const [saved, daily] = await Promise.all([
        base44.entities.WorkoutSession.filter({ athlete_id, date: day }, 'date', MAX_ROWS_PER_DATE),
        base44.entities.DailyMetrics.filter({ athlete_id, date: day }, 'date', MAX_ROWS_PER_DATE),
      ]);
      if (!Array.isArray(saved) || !Array.isArray(daily) ||
          saved.length >= MAX_ROWS_PER_DATE || daily.length >= MAX_ROWS_PER_DATE) {
        return Response.json({ success: false, code: 'INCOMPLETE_HISTORY_READ',
          error: 'A day exceeded the verified read limit; no rest status was changed.' }, { status: 409 });
      }
      sessions.push(...saved);
      metrics.push(...daily);
    }

    const days = buildRestReview(sessions, metrics, start, end);
    if (action === 'preview') {
      return Response.json({ success: true, days, provider_sync_note:
        'Provider sync timestamps do not establish a rest day. Review missing days and confirm only dates you know were rest.' });
    }
    const day = days[0];
    if (!canConfirmRest(day, confirm_rest)) {
      return Response.json({ success: false, code: 'REST_CONFIRMATION_CONFLICT',
        day, error: 'A workout, incomplete load, or existing rest record prevents this confirmation.' }, { status: 409 });
    }
    if (metrics.length > 1) {
      return Response.json({ success: false, code: 'DUPLICATE_DAILY_METRICS',
        error: 'Multiple DailyMetrics records exist; no change was made.' }, { status: 409 });
    }
    const payload = { confirmed_rest: true, confirmed_rest_source: 'athlete_declaration',
      confirmed_rest_at: new Date().toISOString() };
    if (metrics.length === 1) {
      await base44.entities.DailyMetrics.update(metrics[0].id, payload);
    } else {
      await base44.entities.DailyMetrics.create({ athlete_id, date, ...payload });
    }
    // Never recalculate CTL/ATL automatically: concurrent imports may still
    // race this write. Future work needs an atomic session/rest constraint.
    return Response.json({ success: true, date, confirmed_rest: true,
      note: 'Rest was confirmed by the athlete. Training-load recomputation is not automatically triggered.' });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Rest review failed' }, { status: 500 });
  }
});
