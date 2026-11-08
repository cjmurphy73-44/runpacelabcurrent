// Replace undeployable Python placeholders with a fail-closed endpoint.
// PR 3 implements authenticated athlete consent and coach assignment.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.59';

export async function invitationUnavailable(req: Request): Promise<Response> {
  const user = await createClientFromRequest(req).auth.me().catch(() => null);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  return Response.json({
    error: 'Coach invitations are unavailable while the consent flow is being upgraded.',
    code: 'coach_invitation_unavailable',
  }, { status: 503 });
}
