// Athlete-authenticated self-reported race submission. Does not claim provider verification.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { validateAttestedRaceResult } from '../../shared/raceResultContract.ts';

export default async function (req: Request): Promise<Response> {
  if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const linkedId = user.data?.athlete_profile_id || user.athlete_profile_id || null;
    if (!linkedId) return Response.json({ error: 'An owned athlete profile is required' }, { status: 403 });
    const athlete = await base44.entities.AthleteProfile.get(linkedId).catch(() => null);
    if (!athlete || athlete.created_by_id !== user.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    const body = await req.json().catch(() => null);
    let record;
    try { record = validateAttestedRaceResult(body); }
    catch (error) { return Response.json({ error: error.message }, { status: 400 }); }
    // Never accept client-supplied athlete_id, evidence_status or source provider claims.
    const created = await base44.entities.RaceResult.create({ ...record, athlete_id: athlete.id });
    return Response.json({
      id: created.id,
      evidence_status: 'self_reported',
      message: 'Race result saved as athlete-reported; not independently verified',
    }, { status: 201 });
  } catch (error) {
    console.error('submitRaceResult failed', error);
    return Response.json({ error: 'Unable to save race result' }, { status: 500 });
  }
}
