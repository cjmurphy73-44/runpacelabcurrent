import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { assertOwnsAthlete } from '../../shared/ownership.ts';
import { buildRestReview } from '../../shared/restDayReview.ts';
import { readDiagnosticPages } from '../../shared/diagnosticPagination.ts';
import { classifyRestReviewRequest } from '../../shared/restReviewPolicy.ts';

const PAGE_SIZE = 100;
const MAX_ROWS_PER_DATE = 1000;
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
    const policy = classifyRestReviewRequest({ athlete_id, action, start_date, end_date, date, confirm_rest }, new Date().toISOString().slice(0, 10));
    if (!policy.ok) {
      if (policy.code === 'ATOMIC_REST_CONFIRMATION_UNAVAILABLE') {
        return Response.json({ success: false, code: policy.code,
          error: 'Rest confirmation is unavailable until concurrent workout imports can be handled safely. No data was changed.' }, { status: 409 });
      }
      return Response.json({ success: false, code: policy.code,
        error: 'Invalid historical review request.' }, { status: policy.status });
    }
    const { start, end } = policy;

    const sessions: any[] = [];
    const metrics: any[] = [];
    // Offset pagination is supported for diagnostic reads, but it is NOT a
    // transactionally consistent snapshot. Never use it to authorize writes.
    for (let ms = Date.parse(start + 'T00:00:00Z'); ms <= Date.parse(end + 'T00:00:00Z'); ms += 86400000) {
      const day = new Date(ms).toISOString().slice(0, 10);
      try {
        const [saved, daily] = await Promise.all([
          readDiagnosticPages<any>((limit, skip) =>
            base44.entities.WorkoutSession.filter({ athlete_id, date: day }, 'created_date', limit, skip),
            { pageSize: PAGE_SIZE, maxRows: MAX_ROWS_PER_DATE }),
          readDiagnosticPages<any>((limit, skip) =>
            base44.entities.DailyMetrics.filter({ athlete_id, date: day }, 'created_date', limit, skip),
            { pageSize: PAGE_SIZE, maxRows: MAX_ROWS_PER_DATE }),
        ]);
        sessions.push(...saved);
        metrics.push(...daily);
      } catch {
        // Do not return SDK errors, query details, or internal identifiers.
        return Response.json({ success: false, code: 'INCOMPLETE_HISTORY_READ',
          error: 'Unable to establish complete diagnostic history for ' + day +
            '. No rest status was changed.',
          }, { status: 409 });
      }
    }

    const days = buildRestReview(sessions, metrics, start, end);
    if (action === 'preview') {
      return Response.json({ success: true, days, provider_sync_note:
        'Provider sync timestamps do not establish a rest day. Review missing days and confirm only dates you know were rest.' });
    }
    return Response.json({ success: false, code: 'ATOMIC_REST_CONFIRMATION_UNAVAILABLE',
      error: 'Rest confirmation is unavailable; no data was changed.' }, { status: 409 });
  } catch (error) {
    // SDK and backend errors may contain internal identifiers. Fail closed.
    return Response.json({ error: 'History review unavailable', code: 'REST_REVIEW_UNAVAILABLE' }, { status: 500 });
  }
});
