// base44/functions/recalculateCTLATLTSB/entry.ts
// Recomputes Chronic/acute Training Load (CTL/ATL) and Training Stress Balance (TSB) for an athlete
// as a continuous day-by-day EWMA over daily TRIMP, writing the values back to DailyMetrics.
// Invoked by calculateDailyTRIMP (after each daily TRIMP update) and by the workoutWebhook ingest path.
// Runs as service role — athlete_id is the trusted input from other backend functions, so no auth.me.
// Batches all DailyMetrics writes (bulkUpdate/bulkCreate) instead of one-per-day so large histories don't time out.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const DAY_MS = 86400000;

export default async function(req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const { athlete_id } = await req.json().catch(() => ({}));
    if (!athlete_id) return Response.json({ error: 'athlete_id is required' }, { status: 400 });

    const athlete = await base44.asServiceRole.entities.AthleteProfile.get(athlete_id).catch(() => null);
    
    // Configurable time constants based on tier preference
    let timeConstantCTL = 42; 
    let timeConstantATL = 7;
    if (athlete?.training_tier_preference) {
      switch (athlete.training_tier_preference.toLowerCase()) {
        case 'conservative':
          timeConstantCTL = 10;
          timeConstantATL = 12;
          break;
        case 'aggressive':
          timeConstantCTL = 28;
          timeConstantATL = 5;
          break;
      }
    }
    
    const ctlAlpha = 2 / (timeConstantCTL + 1);
    const atlAlpha = 2 / (timeConstantATL + 1);

    // Aggregate TRIMP per calendar date
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

    if (workoutDates.length === 0) {
      const ids = existing.map((m) => m.id);
      for (let i = 0; i < ids.length; i += 500) {
        await base44.asServiceRole.entities.DailyMetrics.bulkUpdate(
          ids.slice(i, i + 500).map((id) => ({ id, calculated_ctl: 0, calculated_atl: 0, calculated_tsb: 0 }))
        );
      }
      await base44.asServiceRole.entities.AthleteProfile.update(athlete_id, {
        current_ctl: 0, current_atl: 0, current_tsb: 0, last_data_sync: new Date().toISOString(),
      }).catch((e) => console.warn('recalc: failed to zero profile', e?.message));
      return Response.json({ success: true, ctl: 0, atl: 0, tsb: 0 });
    }

    const persistDates = new Set([...workoutDates, ...existing.map((m) => m.date)]);

    let ctl: number | null = null;
    let currentATL: number | null = null;
    const start = new Date(workoutDates[0] + 'T00:00:00Z');
    const end = new Date();
    const cursor = new Date(start);
    const updates = [];
    const creates = [];

    while (cursor <= end) {
      const iso = cursor.toISOString().slice(0, 10);
      const load = trimpByDate[iso] || 0;
      
      if (ctl === null || currentATL === null) {
        ctl = load;
        currentATL = load;
      } else {
        ctl = ctl + ctlAlpha * (load - ctl);
        currentATL = currentATL + atlAlpha * (load - currentATL);
      }

      if (persistDates.has(iso)) {
        const tsb = ctl - currentATL;
        const payload = {
          calculated_ctl: Math.round(ctl * 10) / 10,
          calculated_atl: Math.round(currentATL * 10) / 10,
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

    const finalCtl = Math.round(ctl * 10) / 10;
    const finalAtl = Math.round(currentATL * 10) / 10;
    const finalTsb = Math.round((ctl - currentATL) * 10) / 10;

    // Persist the latest day's values back to the athlete profile so snapshot readers
    // (FitnessStats, StatusGauges, PhysiologyLab) stay in sync with the recomputed model
    // instead of drifting to stale/garbage stored values.
    await base44.asServiceRole.entities.AthleteProfile.update(athlete_id, {
      current_ctl: finalCtl,
      current_atl: finalAtl,
      current_tsb: finalTsb,
      last_data_sync: new Date().toISOString(),
    }).catch((e) => console.warn('recalc: failed to sync profile snapshot', e?.message));

    return Response.json({ success: true, ctl: finalCtl, atl: finalAtl, tsb: finalTsb });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}