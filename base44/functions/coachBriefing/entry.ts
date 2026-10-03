// base44/functions/coachBriefing/entry.ts
// Server-side, plan-gated Coach Briefing endpoint. Generates a short coach-voiced
// briefing over recent training. Plan-gated server-side so a free-tier user can't
// burn Core InvokeLLM credits by calling the function directly via the SDK.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { assertOwnsAthlete } from '../../shared/ownership.ts';
import { assertPaidPlan } from '../../shared/planGate.ts';
import { claimRateLimit } from '../../shared/rateLimit.ts';

export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const gate = await assertPaidPlan(base44, user);
    if (!gate.ok) return Response.json({ error: 'Coach Briefing requires a Pro plan.', plan: gate.plan }, { status: 402 });

    if (!claimRateLimit(`briefing:${user.id}`, 12, 24 * 3600 * 1000)) {
      return Response.json({ error: 'Rate limit reached for Coach Briefing. Try again later.' }, { status: 429 });
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