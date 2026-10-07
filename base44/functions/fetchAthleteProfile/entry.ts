import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Resolve the linked profile directly by ID first — a filter by created_by_id misses
    // profiles created under a different identity (e.g. a service-role backend function
    // or an earlier auth account), which is exactly why a re-login "lost" an existing
    // profile full of data. RLS read allows id == user.data.athlete_profile_id, so this
    // succeeds even when created_by_id doesn't match. Fall back to owned profiles only
    // when no link is set.
    const linkedId = user.data?.athlete_profile_id;
    if (linkedId) {
      try {
        const linked = await base44.entities.AthleteProfile.get(linkedId);
        if (linked) return Response.json({ athlete: linked });
      } catch (err) {
        // linked id not resolvable — fall through to ownership search
      }
    }
    const profiles = await base44.entities.AthleteProfile.filter({ created_by_id: user.id }, '-updated_date', 50);
    return Response.json({ athlete: profiles[0] || null });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}