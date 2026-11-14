// base44/shared/ctlRecalc.ts
// Pure logic extracted from recalculateCTLATLTSB so both the authed HTTP wrapper
// (client calls) and the external-webhook path (service role, no user) share one
// implementation. Takes a base44 client and runs against its asServiceRole scope.

const DAY_MS = 86400000;

import { calculateFitnessFatigueOde } from './fitnessFatigueOde.ts';
import { auditDailyHistory, assessDailyLoad } from './dailyLoadEvidence.ts';

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
  const existing = await base44.asServiceRole.entities.DailyMetrics.filter({ athlete_id });
  const today = new Date().toISOString().slice(0, 10);
  const coverage = auditDailyHistory(sessions, existing, today);
  if (!coverage.eligible) {
    return { success: false, code: 'LOAD_HISTORY_UNVERIFIED', reason: coverage.reason,
      date: coverage.date, ctl: null, atl: null, tsb: null };
  }
  // No writes occur before this gate. Only explicitly confirmed rest days
  // can contribute zero impulses, and all nonzero loads must use one unit.
  const restDays = new Set(existing.filter((m: any) => m.confirmed_rest === true).map((m: any) => m.date));
  const trimpByDate: Record<string, number> = {};
  // Load is counted once per day, but kept split by provenance so the verified (measured
  // from a per-second stream) and summary (average-HR estimate) contributions never mix
  // silently. A record written before load_source existed counts as a summary estimate.
  const verifiedByDate: Record<string, number> = {};
  const summaryByDate: Record<string, number> = {};
  for (const s of sessions) {
    if (!s.date) continue;
    const assessment = assessDailyLoad([s]);
    if (!assessment.eligible) continue; // coverage gate above already rejects this case
    const load = assessment.load!;
    trimpByDate[s.date] = (trimpByDate[s.date] || 0) + load;
    if (s.load_source === 'stream') verifiedByDate[s.date] = (verifiedByDate[s.date] || 0) + load;
    else summaryByDate[s.date] = (summaryByDate[s.date] || 0) + load;
  }
  for (const date of restDays) if (trimpByDate[date] === undefined) trimpByDate[date] = 0;
  const workoutDates = Object.keys(trimpByDate).sort();

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

  // Build the full daily TRIMP history (including zero-load rest days) for the ODE model.
  // The ODE needs continuous daily impulses to model fitness/fatigue decay on rest days.
  const odeTau1 = athlete?.ode_tau1 || 42;
  const odeTau2 = athlete?.ode_tau2 || 7;
  const odeParams = { tau1: odeTau1, tau2: odeTau2, k1: 1.0, k2: 1.5, baselinePerformance: 50.0 };

  // First pass: build the daily TRIMP history and compute the ODE model states.
  const start = new Date(workoutDates[0] + 'T00:00:00Z');
  const end = new Date();
  const dailyHistory: { date: string; trimp: number }[] = [];
  {
    const cursor = new Date(start);
    while (cursor <= end) {
      const iso = cursor.toISOString().slice(0, 10);
      dailyHistory.push({ date: iso, trimp: trimpByDate[iso] || 0 });
      cursor.setTime(cursor.getTime() + DAY_MS);
    }
  }
  const odeStates = calculateFitnessFatigueOde(dailyHistory, odeParams);
  const odeByDate: Record<string, { fitness: number; fatigue: number; form: number }> = {};
  for (const s of odeStates) odeByDate[s.date] = { fitness: s.fitness, fatigue: s.fatigue, form: s.form };

  // Second pass: EWMA CTL/ATL/TSB with ODE values merged inline.
  let ctl: number | null = null;
  let currentATL: number | null = null;
  const cursor2 = new Date(start);
  const updates: any[] = [];
  const creates: any[] = [];

  while (cursor2 <= end) {
    const iso = cursor2.toISOString().slice(0, 10);
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
      const ode = odeByDate[iso];
      const payload: any = {
        calculated_ctl: Math.round(ctl * 10) / 10,
        calculated_atl: Math.round(currentATL * 10) / 10,
        calculated_tsb: Math.round(tsb * 10) / 10,
        ode_fitness: ode?.fitness ?? 0,
        ode_fatigue: ode?.fatigue ?? 0,
        ode_form: ode?.form ?? 0,
      };
      if (trimpByDate[iso] !== undefined) {
        payload.total_trimp = Math.round(trimpByDate[iso] * 100) / 100;
        payload.verified_trimp = Math.round((verifiedByDate[iso] || 0) * 100) / 100;
        payload.summary_trimp = Math.round((summaryByDate[iso] || 0) * 100) / 100;
      }
      if (existingByDate[iso]) updates.push({ id: existingByDate[iso], ...payload });
      else creates.push({ athlete_id, date: iso, ...payload });
    }
    cursor2.setTime(cursor2.getTime() + DAY_MS);
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