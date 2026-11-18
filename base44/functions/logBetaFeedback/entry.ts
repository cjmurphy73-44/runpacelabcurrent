// base44/functions/logBetaFeedback/entry.ts
// Stores a beta-tester feedback submission in the BetaFeedback entity. Called
// from the dashboard Beta Feedback modal. Authenticated (the modal is behind
// AppLayout) but tolerant: if the caller's session is missing, still accepts
// the submission anonymously so testers never lose feedback to an auth blip.
// RLS on BetaFeedback allows any authenticated user to create their own record;
// only admins can read all of them for triage.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { claimRateLimit } from '../../shared/rateLimit.ts';
import { validatePublicFeedback } from '../../shared/publicFeedbackValidation.js';
import { readBoundedJsonRequest } from '../../shared/boundedJsonRequest.js';

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    // Enforce a byte limit while streaming, including requests with absent
    // or forged Content-Length. Never buffer an unlimited public payload.
    const parsed = await readBoundedJsonRequest(req, 16000);
    if (!parsed.ok) {
      return Response.json({ error: parsed.error }, { status: parsed.status });
    }
    const validation = validatePublicFeedback(parsed.data);
    if (!validation.ok) {
      return Response.json({ error: validation.error }, { status: validation.status });
    }

    // Public support must work without login. Bound anonymous service-role
    // writes per worker; a distributed edge limit is still needed at scale.
    const ip = req.headers.get('cf-connecting-ip') ||
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (!claimRateLimit(`public-feedback:${ip}`, 5, 5 * 60 * 1000)) {
      return Response.json({ error: 'Too many submissions. Please try again later.' }, { status: 429 });
    }

    const record = await base44.asServiceRole.entities.BetaFeedback.create(validation.data);

    return Response.json({ success: true, id: record.id });
  } catch (error) {
    // A public endpoint must not expose provider, database or secret details.
    console.error('logBetaFeedback failed');
    return Response.json({ error: 'Unable to submit feedback. Please try again.' }, { status: 500 });
  }
}