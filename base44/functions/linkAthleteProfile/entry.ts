import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { isRecordId } from '../../shared/ownership.ts';

Deno.serve(async (req: Request) => {
  const base44 = createClientFromRequest(req);
  try {
    const user = await base44.auth.me().catch(() => null);
    if (!user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { athlete_id } = (await req.json().catch(() => null)) ?? {};
    if (!isRecordId(athlete_id)) return Response.json({ error: 'athlete_id is required' }, { status: 400 });
    const entities = base44.asServiceRole.entities;
    const profile = await entities.AthleteProfile.get(athlete_id).catch(() => null);
    if (profile?.id !== athlete_id || profile.created_by_id !== user.id) {
      return Response.json({ error: 'Athlete profile not found' }, { status: 404 });
    }
    const verified = user.data?.verified_athlete_profile_id ?? user.verified_athlete_profile_id;
    if (verified === athlete_id) return Response.json({ success: true });

    await entities.User.update(user.id, {
      athlete_profile_id: athlete_id,
      verified_athlete_profile_id: athlete_id,
    });
    return Response.json({ success: true });
  } catch {
    return Response.json({ error: 'Could not link athlete profile' }, { status: 500 });
  }
});
