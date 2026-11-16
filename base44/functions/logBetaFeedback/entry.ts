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
    // Reject oversized reports before service-role persistence. Silent truncation
    // loses incident evidence and can make an unsafe submission look complete.
    if (typeof body.message !== 'string' || !body.message.trim()) {
      return Response.json({ error: 'message is required' }, { status: 400 });
    }
    if (body.message.length > 4000 || (body.contact_email != null &&
        (typeof body.contact_email !== 'string' || body.contact_email.length > 200))) {
      return Response.json({ error: 'support fields exceed allowed length' }, { status: 400 });
    }
    const message = body.message;
    const contact_email = body.contact_email || undefined;
    const route = body.route ? String(body.route).slice(0, 300) : undefined;

    // Use asServiceRole so public (unauthenticated) support submissions from the
    // /support page succeed — the user-scoped client would fail RLS without a session.
    const record = await base44.asServiceRole.entities.BetaFeedback.create({
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