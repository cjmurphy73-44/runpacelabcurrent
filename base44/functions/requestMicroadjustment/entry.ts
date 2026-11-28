import { createClientFromRequest } from 'npm:@base44/sdk@0.8.63';
import { handleAthletePlanReview } from '../../shared/athletePlanReview.ts';

// Legacy endpoint retained for existing clients. It may PREVIEW only. An
// explicit second request to athletePlanReview is required to apply a change.
// Never trust client-supplied TSB or allow direct LLM writes from this route.
Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
  const body = await req.json().catch(() => null);
  if (!body?.session_id) return Response.json({
    error: 'Choose an upcoming session to review. No automatic changes were made.',
    approval_required: true,
  }, { status: 409 });
  return handleAthletePlanReview(createClientFromRequest(req),
    new Request(req.url, { method: 'POST', headers: req.headers,
      body: JSON.stringify({ action: 'preview', session_id: body.session_id }) }));
});
