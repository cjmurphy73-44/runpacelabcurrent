// base44/functions/aiDeepDive/entry.ts
// Server-side subscription enforced AI Deep Dive endpoint

<<<<<<< Updated upstream
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { assertOwnsAthlete } from '../../shared/ownership.ts';
import { assertPaidPlan } from '../../shared/planGate.ts';
import { claimRateLimit } from '../../shared/rateLimit.ts';
=======
import { createClientFromRequest } from 'npm:@base44/runtime';
import { verifySubscription } from '../common/auth.ts';
>>>>>>> Stashed changes

export default async function (req: Request) {
  const base44 = createClientFromRequest(req);

<<<<<<< Updated upstream
    const gate = await assertPaidPlan(base44, user);
    if (!gate.ok) return Response.json({ error: 'AI Deep Dive requires a Pro plan.', plan: gate.plan }, { status: 402 });

    // Per-user sliding-window cap protects integration credits from a single
    // paying user spamming the endpoint. Plan gate above is the hard boundary.
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
=======
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
>>>>>>> Stashed changes
    });
  }

  // Enforce server-side Pro tier gating
  const authCheck = await verifySubscription(req, 'pro');
  if (!authCheck.authorized) {
    return new Response(JSON.stringify({ error: authCheck.error }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const { activityId } = body;

    if (!activityId) {
      return new Response(JSON.stringify({ error: 'Missing activityId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // TODO: Insert your existing AI Deep Dive generation logic here using base44.integrations.CoreAI

    return new Response(JSON.stringify({ success: true, message: 'AI Deep Dive generated successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
