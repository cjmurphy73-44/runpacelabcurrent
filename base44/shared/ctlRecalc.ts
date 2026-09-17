// base44/shared/ctlRecalc.ts
// Pure logic extracted from recalculateCTLATLTSB so both the authed HTTP wrapper
// (client calls) and the external-webhook path (service role, no user) share one
// implementation. Takes a base44 client and runs against its asServiceRole scope.

const DAY_MS = 86400000;

export async function recomputeCTLATLTSB(base44: any, athlete_id: string) {
  const athlete = await base44.asServiceRole.entities.AthleteProfile.get(athlete_id).catch(() => null);

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

  const sessions = await base44.asServiceRole.entities.WorkoutSession.filter({ athlete_id });
  const trimpByDate: Record<string, number> = {};
  for (const s of sessions) {
    if (!s.date) continue;
    trimpByDate[s.date] = (trimpByDate[s.date] || 0) + (s.session_trimp || s.session_tss || 0);
  }
  const workoutDates = Object.keys(trimpByDate).sort();

  const existing = await base44.asServiceRole.entities.DailyMetrics.filter({ athlete_id });
  const existingByDate: Record<string, string> = {};
  for (const m of existing) existingByDate[m.date] = m.id;

  if (workoutDates.length === 0) {
    const ids = existing.map((m) => m.id);
    for (let i = 0; i < ids.length; i += 500) {
      await base44.asServiceRole.entities.DailyMetrics.bulkUpdate(
        ids.slice(i, i + 500).map((id) => ({ id, calculated_ctl: 0, calculated_atl: 0, calculated_tsb: 0 })),
      );
    }
    await base44.asServiceRole.entities.AthleteProfile.update(athlete_id, {
      current_ctl: 0, current_atl: 0, current_tsb: 0, last_data_sync: new Date().toISOString(),
    }).catch((e: any) => console.warn('recalc: failed to zero profile', e?.message));
    return { success: true, ctl: 0, atl: 0, tsb: 0 };
  }

  const persistDates = new Set([...workoutDates, ...existing.map((m) => m.date)]);

  let ctl: number | null = null;
  let currentATL: number | null = null;
  const start = new Date(workoutDates[0] + 'T00:00:00Z');
  const end = new Date();
  const cursor = new Date(start);
  const updates: any[] = [];
  const creates: any[] = [];

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
      const payload: any = {
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

  await base44.asServiceRole.entities.AthleteProfile.update(athlete_id, {
    current_ctl: finalCtl,
    current_atl: finalAtl,
    current_tsb: finalTsb,
    last_data_sync: new Date().toISOString(),
  }).catch((e: any) => console.warn('recalc: failed to sync profile snapshot', e?.message));

  return { success: true, ctl: finalCtl, atl: finalAtl, tsb: finalTsb };
}