import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { getAuthorizedAthlete, isRecordId } from '../../shared/ownership.ts';
import { recomputeCTLATLTSB } from '../../shared/ctlRecalc.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { athlete_id } = (await req.json().catch(() => null)) ?? {};
    if (!isRecordId(athlete_id)) return Response.json({ error: 'athlete_id is required' }, { status: 400 });
    if (!(await getAuthorizedAthlete(base44, user, athlete_id))) {
      return Response.json({ error: 'Athlete profile not found' }, { status: 404 });
    }

    return Response.json(await recomputeCTLATLTSB(base44, athlete_id));
  } catch {
    return Response.json({ error: 'Could not refresh telemetry' }, { status: 500 });
  }
});
