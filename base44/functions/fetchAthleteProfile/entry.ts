import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // The athlete profile is linked to the user via the built-in created_by_id field.
    const profiles = await base44.entities.AthleteProfile.filter({ created_by_id: user.id }, '-created_date', 1);
    return Response.json({ athlete: profiles[0] || null });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}