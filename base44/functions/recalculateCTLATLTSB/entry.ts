// base44/functions/recalculateCTLATLTSB/entry.ts
// Recomputes Chronic/acute Training Load (CTL/ATL) and Training Stress Balance (TSB) for an athlete
// as a continuous day-by-day EWMA over daily TRIMP, writing the values back to DailyMetrics.
// Invoked by calculateDailyTRIMP (after each daily TRIMP update) and by the workoutWebhook ingest path.
// Runs as service role — athlete_id is the trusted input from other backend functions, so no auth.me.
// Batches all DailyMetrics writes (bulkUpdate/bulkCreate) instead of one-per-day so large histories don't time out.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const DAY_MS = 86400000;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { athlete_id } = await req.json().catch(() => ({}));
    if (!athlete_id) return Response.json({ error: 'athlete_id is required' }, { status: 400 });

    const athlete = await base44.asServiceRole.entities.AthleteProfile.get(athlete_id).catch(() => null);
    const ctlTau = athlete?.ctl_time_constant_days || 42;
    const atlTau = athlete?.atl_time_constant_days || 7;
    const ctlAlpha = 2 / (ctlTau + 1);
    const atlAlpha = 2 / (atlTau + 1);

    // Aggregate TRIMP per calendar date from the master workout log (HR-based TRIMP, rTSS fallback).
    const sessions = await base44.asServiceRole.entities.WorkoutSession.filter({ athlete_id });
    const trimpByDate = {};
    for (const s of sessions) {
      if (!s.date) continue;
      trimpByDate[s.date] = (trimpByDate[s.date] || 0) + (s.session_trimp || s.session_tss || 0);
    }
    const workoutDates = Object.keys(trimpByDate).sort();

    const existing = await base44.asServiceRole.entities.DailyMetrics.filter({ athlete_id });
    const existingByDate = {};
    for (const m of existing) existingByDate[m.date] = m.id;

    // No workouts: clear any stale CTL/ATL so the dashboard doesn't show phantom fitness.
    if (workoutDates.length === 0) {
      const ids = existing.map((m) => m.id);
      for (let i = 0; i < ids.length; i += 500) {
        await base44.asServiceRole.entities.DailyMetrics.bulkUpdate(
          ids.slice(i, i + 500).map((id) => ({ id, calculated_ctl: 0, calculated_atl: 0, calculated_tsb: 0 }))
        );
      }
      return Response.json({ success: true, ctl: 0, atl: 0, tsb: 0 });
    }

    // Only persist rows for days that already have a metric record OR a workout — keeps the table lean
    // while the EWMA still walks every calendar day for a correct decayed value at those points.
    const persistDates = new Set([...workoutDates, ...existing.map((m) => m.date)]);

    let ctl = 0, atl = 0;
    const start = new Date(workoutDates[0] + 'T00:00:00Z');
    const end = new Date();
    const cursor = new Date(start);
    const updates = [];
    const creates = [];

    while (cursor <= end) {
      const iso = cursor.toISOString().slice(0, 10);
      const load = trimpByDate[iso] || 0;
      ctl = ctl + ctlAlpha * (load - ctl);
      atl = atl + atlAlpha * (load - atl);

      if (persistDates.has(iso)) {
        const tsb = ctl - atl;
        const payload = {
          calculated_ctl: Math.round(ctl * 10) / 10,
          calculated_atl: Math.round(atl * 10) / 10,
          calculated_tsb: Math.round(tsb * 10) / 10,
        };
        if (trimpByDate[iso] !== undefined) payload.total_trimp = Math.round(trimpByDate[iso] * 100) / 100;
        if (existingByDate[iso]) updates.push({ id: existingByDate[iso], ...payload });
        else creates.push({ athlete_id, date: iso, ...payload });
      }
      cursor.setTime(cursor.getTime() + DAY_MS);
    }

    for (let i = 0; i < updates.length; i += 500) {
      await base44.asServiceRole.entities.DailyMetrics.bulkUpdate(updates.slice(i, i + 500));
    }
    for (let i = 0; i < creates.length; i += 500) {
      await base44.asServiceRole.entities.DailyMetrics.bulkCreate(creates.slice(i, i + 500));
    }

    return Response.json({
      success: true,
      ctl: Math.round(ctl * 10) / 10,
      atl: Math.round(atl * 10) / 10,
      tsb: Math.round((ctl - atl) * 10) / 10,
      updated: updates.length,
      created: creates.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});