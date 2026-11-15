import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

/**
 * Only return an athlete profile when ownership is verified by the persisted
 * creator stamp. A User.athlete_profile_id value is not an authorization grant:
 * the field-level update restrictions have not been verified on Base44.
 *
 * Service-created profiles without verified owner provenance remain blocked
 * pending an isolated staging ownership reconciliation.
 */
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const profiles = await base44.entities.AthleteProfile.filter(
      { created_by_id: user.id }, '-updated_date', 50,
    );
    if (!Array.isArray(profiles) || profiles.some((p) => !p?.id || p.created_by_id !== user.id)) {
      return Response.json({ error: 'Profile ownership could not be verified' }, { status: 403 });
    }
    return Response.json({ athlete: profiles[0] || null });
  } catch {
    return Response.json({ error: 'Unable to load athlete profile' }, { status: 500 });
  }
}
