import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { claimRateLimit } from '../../shared/rateLimit.ts';
import { readLimitedJson } from '../../shared/requestJson.ts';

const types = ['bug', 'idea', 'other', 'billing', 'account'];

Deno.serve(async (req: Request) => {
  const base44 = createClientFromRequest(req);
  try {
    const user = await base44.auth.me().catch(() => null);
    if (!user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });

    const input = await readLimitedJson(req);
    const { feedback_type, message, contact_email, route } = input ?? {};
    if (!types.includes(feedback_type) || typeof message !== 'string' || !message.trim() || message.length > 4000 ||
        (contact_email != null && (typeof contact_email !== 'string' || contact_email.length > 200 ||
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact_email.trim()))) ||
        (route != null && (typeof route !== 'string' || route.length > 300 || !/^\/[a-z0-9/_-]*$/i.test(route)))) {
      return Response.json({ error: 'Invalid feedback' }, { status: 400 });
    }

    const hour = 3_600_000;
    if (!claimRateLimit(`feedback:${user.id}`, 5, hour)) {
      return Response.json({ error: 'Too many feedback submissions' }, { status: 429 });
    }
    const feedback = base44.asServiceRole.entities.BetaFeedback;
    const since = new Date(Date.now() - hour).toISOString();
    const recent = await feedback.filter({ created_by_id: user.id, created_date: { $gte: since } }, '-created_date', 5, 0, ['id']);
    if (recent.length >= 5) return Response.json({ error: 'Too many feedback submissions' }, { status: 429 });
    const record = await feedback.create({
      created_by_id: user.id, feedback_type, message: message.trim(), contact_email: contact_email?.trim(), route,
    });
    return Response.json({ success: true, id: record.id });
  } catch {
    return Response.json({ error: 'Could not save feedback' }, { status: 500 });
  }
});
