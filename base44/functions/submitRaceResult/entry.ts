// Authenticated self-reported race submission and owner-only correction.
// Duplicate checks are best-effort, NOT atomic across concurrent requests.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { validateAttestedRaceResult, findDuplicateRaceResult } from '../../shared/raceResultContract.ts';

export default async function (req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const linkedId = user.data?.athlete_profile_id || user.athlete_profile_id;
    if (!linkedId || typeof linkedId !== 'string') {
      return Response.json({ error: 'An owned athlete profile is required' }, { status: 403 });
    }
    const athlete = await base44.entities.AthleteProfile.get(linkedId).catch(() => null);
    if (!athlete || athlete.id !== linkedId || athlete.created_by_id !== user.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    const body = await req.json().catch(() => null);
    let record;
    try { record = validateAttestedRaceResult(body); }
    catch (error) { return Response.json({ error: error.message }, { status: 400 }); }

    const correctionId = body?.action === 'correct' ? body?.id : null;
    if (body?.action === 'correct' && (typeof correctionId !== 'string' || !correctionId)) {
      return Response.json({ error: 'Race result id is required for correction' }, { status: 400 });
    }

    // Query under the authenticated user's entity permissions, not service role.
    // An exact-match query avoids silently accepting a truncated historical list.
    const candidates = await base44.asServiceRole.entities.RaceResult.filter({
      athlete_id: athlete.id,
      created_by_id: user.id,
      race_date: record.race_date,
      distance_m: record.distance_m,
      elapsed_seconds: record.elapsed_seconds,
    });
    if (!Array.isArray(candidates)) throw new Error('Race result duplicate check failed');
    const ownCandidates = candidates.filter(item => item.created_by_id === user.id);
    const duplicate = findDuplicateRaceResult(ownCandidates, record, correctionId);
    if (duplicate) {
      return Response.json({ error: 'This race result already exists', existing_id: duplicate.id }, { status: 409 });
    }

    if (body?.action === 'correct') {
      const existing = await base44.asServiceRole.entities.RaceResult.get(correctionId).catch(() => null);
      if (!existing || existing.created_by_id !== user.id || existing.athlete_id !== athlete.id ||
          existing.evidence_source !== 'athlete_attested' || existing.evidence_status !== 'self_reported') {
        return Response.json({ error: 'Race result not found or not editable' }, { status: 404 });
      }
      if (!Number.isSafeInteger(body?.expected_revision) || body.expected_revision < 1 ||
          existing.revision !== body.expected_revision) {
        return Response.json({ error: 'Race result changed; reload before correcting', current_revision: existing.revision ?? null }, { status: 409 });
      }
      // Read-compare-update is NOT atomic. No concurrent edit guarantee until Base44 CAS is verified.
      const updated = await base44.asServiceRole.entities.RaceResult.update(correctionId, {
        ...record, revision: existing.revision + 1,
      });
      return Response.json({ id: updated.id, revision: updated.revision, evidence_status: 'self_reported', message: 'Athlete-reported race corrected' });
    }

    const created = await base44.asServiceRole.entities.RaceResult.create({
      ...record, athlete_id: athlete.id, created_by_id: user.id, revision: 1,
    });
    // Fail closed if service-role creation did not preserve explicit ownership metadata.
    if (!created?.id || created.athlete_id !== athlete.id || created.created_by_id !== user.id) {
      throw new Error('Race result ownership persistence not verified');
    }
    return Response.json({
      id: created.id,
      revision: created.revision,
      evidence_status: 'self_reported',
      message: 'Race result saved as athlete-reported; not independently verified',
    }, { status: 201 });
  } catch (error) {
    console.error('submitRaceResult failed', error);
    return Response.json({ error: 'Unable to save race result' }, { status: 500 });
  }
}
