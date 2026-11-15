import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { assertPaidPlan } from '../../shared/planGate.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const gate = await assertPaidPlan(base44, user);
    if (!gate.ok) return Response.json({ error: 'Micro-adjustments require a Pro plan.', plan: gate.plan }, { status: 402 });

    // Safety gate: the current endpoint derives physiological adjustments from
    // unverified TSB and short telemetry windows, then writes AI-proposed changes.
    // Until athlete ownership, complete daily load provenance, calibrated
    // deterministic decisions, and explicit review are integrated end-to-end,
    // fail closed. Do not mutate any plan sessions or create coach messages.
    return Response.json({
      error: 'Automatic training-plan adjustments are temporarily unavailable while verified training-history safeguards are implemented.',
      code: 'ADAPTATION_REQUIRES_VERIFIED_HISTORY',
      adjusted: [],
      retryable: false,
    }, { status: 409 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});