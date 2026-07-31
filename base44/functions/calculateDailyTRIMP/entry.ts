import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { athlete_id, date } = await req.json();
    if (!athlete_id || !date) {
      return Response.json({ error: 'athlete_id and date are required' }, { status: 400 });
    }

    const sessions = await base44.entities.WorkoutSession.filter({ athlete_id, date });
    // Use HR-based TRIMP as the primary stress metric; fall back to rTSS when HR was unavailable.
    const totalTrimp = sessions.reduce((sum, s) => sum + (s.session_trimp || s.session_tss || 0), 0);
    const rounded = Math.round(totalTrimp * 100) / 100;

    const existing = await base44.entities.DailyMetrics.filter({ athlete_id, date });
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