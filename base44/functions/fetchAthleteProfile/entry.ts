import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getOwnedAthlete } from '../../shared/ownership.ts';

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    return Response.json({ athlete: await getOwnedAthlete(base44, user.id) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
