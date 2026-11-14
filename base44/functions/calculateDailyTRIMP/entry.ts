import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { assertOwnsAthlete } from '../../shared/ownership.ts';
import { assessDailyLoad } from '../../shared/dailyLoadEvidence.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { athlete_id, date } = await req.json();
    if (!athlete_id || !date) {
      return Response.json({ error: 'athlete_id and date are required' }, { status: 400 });
    }

    // Ownership gate: prevent a caller from forging a DailyMetrics row against another
    // athlete's id (the no-row create path only checks created_by_id, not athlete_id).
    if (!(await assertOwnsAthlete(base44, user, athlete_id))) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const sessions = await base44.entities.WorkoutSession.filter({ athlete_id, date });
    const existing = await base44.entities.DailyMetrics.filter({ athlete_id, date });
    const assessment = assessDailyLoad(sessions, existing.some((m) => m.confirmed_rest === true));
    if (!assessment.eligible) {
      return Response.json({ success: false, code: 'DAILY_LOAD_UNVERIFIED',
        reason: assessment.reason, athlete_id, date, total_trimp: null }, { status: 409 });
    }
    // The legacy field is named total_trimp. Do not put TSS into it.
    if (assessment.unit === 'tss') {
      return Response.json({ success: false, code: 'INCOMPATIBLE_LOAD_UNIT',
        reason: 'TSS cannot be stored as TRIMP without a validated conversion.',
        athlete_id, date, total_trimp: null }, { status: 409 });
    }
    const rounded = assessment.load!;
    if (existing.length > 0) {
      await base44.entities.DailyMetrics.update(existing[0].id, { total_trimp: rounded });
    } else {
      await base44.entities.DailyMetrics.create({
        athlete_id,
        date,
        total_trimp: rounded,
        calculated_ctl: 0,
        calculated_atl: 0,
        calculated_tsb: 0,
      });
    }

    await base44.functions.invoke('recalculateCTLATLTSB', { athlete_id });

    return Response.json({ success: true, athlete_id, date, total_trimp: rounded });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});