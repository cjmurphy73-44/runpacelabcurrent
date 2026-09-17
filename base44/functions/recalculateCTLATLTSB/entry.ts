// base44/functions/recalculateCTLATLTSB/entry.ts
// Authed HTTP wrapper around the shared recomputeCTLATLTSB logic.
// Client pages (OcrVerificationModal, ManualWorkoutModal, WorkoutLogWizard,
// ActivityDetail) call this with the user's app token; the external-webhook path
// calls recomputeCTLATLTSB() directly via the shared module (no HTTP hop).

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { recomputeCTLATLTSB } from '../../shared/ctlRecalc.ts';
import { assertOwnsAthlete } from '../../shared/ownership.ts';

export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { athlete_id } = await req.json().catch(() => ({}));
    if (!athlete_id) return Response.json({ error: 'athlete_id is required' }, { status: 400 });

    if (!(await assertOwnsAthlete(base44, user, athlete_id))) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const result = await recomputeCTLATLTSB(base44, athlete_id);
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}