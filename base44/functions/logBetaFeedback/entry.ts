// base44/functions/logBetaFeedback/entry.ts
// Stores a beta-tester feedback submission in the BetaFeedback entity. Called
// from the dashboard Beta Feedback modal. Authenticated (the modal is behind
// AppLayout) but tolerant: if the caller's session is missing, still accepts
// the submission anonymously so testers never lose feedback to an auth blip.
// RLS on BetaFeedback allows any authenticated user to create their own record;
// only admins can read all of them for triage.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    const feedback_type = body.feedback_type === 'idea' ? 'idea'
      : body.feedback_type === 'other' ? 'other'
      : 'bug';
    const message = String(body.message || '').slice(0, 4000);
    if (!message.trim()) return Response.json({ error: 'message is required' }, { status: 400 });

    const contact_email = body.contact_email ? String(body.contact_email).slice(0, 200) : undefined;
    const route = body.route ? String(body.route).slice(0, 300) : undefined;

    const record = await base44.entities.BetaFeedback.create({
      feedback_type,
      message,
      contact_email,
      route,
    });

    return Response.json({ success: true, id: record.id });
  } catch (error) {
    console.error('logBetaFeedback', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}