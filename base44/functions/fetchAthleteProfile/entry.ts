import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Prefer the profile explicitly linked on the user (set by onboarding / self-heal) so
    // Imports and other consumers resolve deterministically even if a user owns several
    // profiles; fall back to the most recently updated owned one. The old arbitrary
    // first-match returned a random duplicate stub when a user had retried onboarding.
    const profiles = await base44.entities.AthleteProfile.filter({ created_by_id: user.id }, '-updated_date', 50);
    const linked = user.data?.athlete_profile_id ? profiles.find((p) => p.id === user.data.athlete_profile_id) : null;
    return Response.json({ athlete: linked || profiles[0] || null });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}