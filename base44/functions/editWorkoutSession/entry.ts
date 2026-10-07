// Authed HTTP handler for correcting or deleting an existing WorkoutSession.
// Preserves data integrity: any date change (or deletion) triggers a full
// CTL/ATL/TSB recompute so the EWMA model and DailyMetrics stay consistent with
// the corrected activity. Ownership is enforced via the shared athlete guard.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { assertOwnsAthlete } from '../../shared/ownership.ts';
import { recomputeCTLATLTSB } from '../../shared/ctlRecalc.ts';

const EDITABLE_FIELDS = new Set([
  'date', 'sport', 'duration_minutes', 'duration_seconds', 'distance_km',
  'avg_hr', 'max_hr', 'avg_power', 'avg_cadence',
]);

const VALID_SPORTS = new Set(['running', 'cycling', 'swimming', 'strength', 'triathlon', 'other']);

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { workout_id, action } = body;
    if (!workout_id) return Response.json({ error: 'workout_id is required' }, { status: 400 });
    if (action !== 'update' && action !== 'delete') {
      return Response.json({ error: 'action must be "update" or "delete"' }, { status: 400 });
    }

    const session = await base44.entities.WorkoutSession.get(workout_id).catch(() => null);
    if (!session) return Response.json({ error: 'Workout not found' }, { status: 404 });

    if (!(await assertOwnsAthlete(base44, user, session.athlete_id))) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (action === 'delete') {
      // Remove dependent records first so they don't dangle after the session is gone.
      const [assets, feedback] = await Promise.all([
        base44.asServiceRole.entities.WorkoutAsset.filter({ session_id: workout_id }),
        base44.asServiceRole.entities.WorkoutFeedback.filter({ workout_id }),
      ]);
      if (assets.length) {
        await base44.asServiceRole.entities.WorkoutAsset.deleteMany({ id: { $in: assets.map((a) => a.id) } });
      }
      if (feedback.length) {
        await base44.asServiceRole.entities.WorkoutFeedback.deleteMany({ id: { $in: feedback.map((f) => f.id) } });
      }
      await base44.entities.WorkoutSession.delete(workout_id);
      await recomputeCTLATLTSB(base44, session.athlete_id).catch((e: any) =>
        console.warn('editWorkout: recalc after delete failed', e?.message));
      return Response.json({ success: true, deleted: true });
    }

    // action === 'update'
    const updates = body.updates || {};
    const cleaned: any = {};
    let dateChanged = false;
    for (const [k, v] of Object.entries(updates)) {
      if (!EDITABLE_FIELDS.has(k)) continue;
      if (v === undefined || v === null || v === '') continue;
      if (k === 'sport' && !VALID_SPORTS.has(v)) {
        return Response.json({ error: 'Invalid sport' }, { status: 400 });
      }
      if (k === 'date') {
        const iso = String(v).slice(0, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
          return Response.json({ error: 'Invalid date (use YYYY-MM-DD)' }, { status: 400 });
        }
        if (iso !== session.date) dateChanged = true;
        cleaned.date = iso;
      } else if (k === 'duration_minutes' || k === 'duration_seconds' || k === 'distance_km' || k === 'avg_power' || k === 'avg_cadence') {
        const n = Number(v);
        if (isNaN(n) || n < 0) return Response.json({ error: `${k} must be a non-negative number` }, { status: 400 });
        cleaned[k] = n;
      } else if (k === 'avg_hr' || k === 'max_hr') {
        const n = Number(v);
        if (isNaN(n) || n < 0) return Response.json({ error: `${k} must be a non-negative number` }, { status: 400 });
        cleaned[k] = Math.round(n);
      } else {
        cleaned[k] = v;
      }
    }

    if (Object.keys(cleaned).length === 0) {
      return Response.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const updated = await base44.entities.WorkoutSession.update(workout_id, cleaned);

    // A date move shifts the daily training-load distribution, so recompute the
    // EWMA model. Duration/HR edits leave session_trimp as-is for now (recomputing
    // it from stored streams is a separate concern) but still trigger a recalc so
    // any downstream DailyMetrics reflect the latest session values.
    await recomputeCTLATLTSB(base44, session.athlete_id).catch((e: any) =>
      console.warn('editWorkout: recalc after update failed', e?.message));

    return Response.json({ success: true, workout: updated, dateChanged });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}