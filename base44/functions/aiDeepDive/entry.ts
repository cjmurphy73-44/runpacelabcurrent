// base44/functions/aiDeepDive/entry.ts
// Server-side, plan-gated AI Deep Dive endpoint. The frontend FeatureGate only hides
// the button; without this server-side check a free-tier user could call the function
// directly via the SDK and burn Core InvokeLLM credits.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { assertOwnsAthlete } from '../../shared/ownership.ts';
import { assertPaidPlan } from '../../shared/planGate.ts';
import { claimRateLimit } from '../../shared/rateLimit.ts';

export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Server-side subscription enforcement (the hard boundary).
    const gate = await assertPaidPlan(base44, user);
    if (!gate.ok) return Response.json({ error: 'AI Deep Dive requires a Pro plan.', plan: gate.plan }, { status: 402 });

    // Per-user sliding-window cap protects integration credits from a single paying user
    // spamming the endpoint. The plan gate above is the hard boundary.
    if (!claimRateLimit(`deepdive:${user.id}`, 20, 24 * 3600 * 1000)) {
      return Response.json({ error: 'Rate limit reached for AI Deep Dive. Try again later.' }, { status: 429 });
    }

    const { athlete_id, prompt, response_json_schema } = await req.json().catch(() => ({}));
    if (!athlete_id || !prompt) {
      return Response.json({ error: 'athlete_id and prompt are required' }, { status: 400 });
    }
    if (!(await assertOwnsAthlete(base44, user, athlete_id))) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      ...(response_json_schema ? { response_json_schema } : {}),
    });

    return Response.json({ success: true, result });
  } catch (error) {
    return Response.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}