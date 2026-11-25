// base44/functions/coachBriefing/entry.ts
// Server-side, plan-gated Coach Briefing endpoint. Generates a short coach-voiced
// briefing over recent training. Plan-gated server-side so a free-tier user can't
// burn Core InvokeLLM credits by calling the function directly via the SDK.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { assertOwnsAthlete, isRecordId } from '../../shared/ownership.ts';
import { assertPaidPlan } from '../../shared/planGate.ts';
import { claimRateLimit } from '../../shared/rateLimit.ts';
import { reportError } from '../../shared/errorReport.ts';

export default async function (req: Request) {
  let base44;
  try {
    base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { athlete_id, prompt, response_json_schema } = await req.json().catch(() => ({}));
    if (!isRecordId(athlete_id) || typeof prompt !== 'string' || !prompt.trim() || prompt.length > 20_000) {
      return Response.json({ error: 'A valid athlete ID and briefing prompt are required.' }, { status: 400 });
    }
    if (!(await assertOwnsAthlete(base44, user, athlete_id))) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    const gate = await assertPaidPlan(base44, user);
    if (!gate.ok) return Response.json({ error: 'Coach Briefing requires a Pro plan.', plan: gate.plan }, { status: 402 });

    if (!claimRateLimit(`briefing:${user.id}`, 12, 24 * 3600 * 1000)) {
      return Response.json({ error: 'Rate limit reached for Coach Briefing. Try again later.' }, { status: 429 });
    }

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      ...(response_json_schema ? { response_json_schema } : {}),
    });

    return Response.json({ success: true, result });
  } catch (error) {
    try { await reportError(base44, { source: 'coachBriefing', message: error.message, stack: error.stack, severity: 'High' }); } catch {}
    return Response.json({ error: 'Could not generate the briefing.' }, { status: 500 });
  }
}
