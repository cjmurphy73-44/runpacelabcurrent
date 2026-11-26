import { createClientFromRequest } from 'npm:@base44/sdk@0.8.63';
import { getOwnedAthlete } from '../../shared/ownership.ts';
import { readLimitedJson } from '../../shared/requestJson.ts';

const scoreFields = new Set(['hrv_score', 'sleep_score', 'readiness_score']);
const allowedFactors: Record<string, string[]> = {
  nutrition_status: ['under_fueled', 'fueled'],
  muscle_soreness: ['low', 'medium', 'high'],
};

function recoveryPatch(record: any) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) return null;
  const { date, ...fields } = record;
  const timestamp = typeof date === 'string' ? Date.parse(`${date}T00:00:00Z`) : NaN;
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== date || !Object.keys(fields).length) return null;

  const patch: Record<string, unknown> = { date };
  for (const [field, input] of Object.entries(fields)) {
    if (field === 'notes') {
      if (typeof input !== 'string' || input.length > 2000) return null;
      patch.notes = input;
      continue;
    }
    if (field === 'holistic_factors') {
      if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
      for (const [key, value] of Object.entries(input)) {
        if (key === 'travel_jet_lag' ? typeof value !== 'boolean' :
          typeof value !== 'string' || !Object.hasOwn(allowedFactors, key) || !allowedFactors[key].includes(value)) return null;
      }
      patch.holistic_factors = input;
      continue;
    }
    if (typeof input !== 'number' || !Number.isFinite(input)) return null;
    if (scoreFields.has(field)) {
      if (!Number.isInteger(input) || input < 0 || input > 100) return null;
    } else if (field === 'hrv') {
      if (input <= 0) return null;
    } else if (field === 'resting_hr') {
      if (!Number.isInteger(input) || input <= 0) return null;
    } else if (field === 'sleep_duration_hours') {
      if (input < 0 || input > 24) return null;
    } else return null;

    if (field === 'readiness_score') {
      patch.provider_readiness_score = input;
      patch.provider_readiness_source = 'manual';
    } else {
      patch[field] = input;
      patch.recovery_source = 'manual';
    }
  }
  return patch;
}

Deno.serve(async (req: Request) => {
  const base44 = createClientFromRequest(req);
  try {
    const user = await base44.auth.me().catch(() => null);
    if (!user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const input = await readLimitedJson(req, 65_536);
    if (!Array.isArray(input?.records) || input.records.length < 1 || input.records.length > 100) {
      return Response.json({ error: 'Provide 1 to 100 recovery records.' }, { status: 400 });
    }
    const athlete = await getOwnedAthlete(base44, user.id);
    if (!athlete || athlete.id !== input.athlete_id) return Response.json({ error: 'Athlete profile not found.' }, { status: 404 });

    const byDate = new Map<unknown, Record<string, unknown>>();
    for (const record of input.records) {
      const patch = recoveryPatch(record);
      if (!patch) return Response.json({ error: 'A recovery row has an invalid date or measurement.' }, { status: 400 });
      byDate.set(patch.date, { ...byDate.get(patch.date), ...patch, athlete_id: athlete.id });
    }
    const result = await base44.asServiceRole.entities.DailyMetrics.upsert([...byDate.values()], { key: ['athlete_id', 'date'] });
    return Response.json({ created: result.created, updated: result.updated });
  } catch (error) {
    console.error('saveDailyRecovery', error instanceof Error ? error.name : 'WriteError');
    return Response.json({ error: 'Recovery save did not complete. Retry to update by date.' }, { status: 500 });
  }
});
