import { createClientFromRequest } from 'npm:@base44/sdk@0.8.63';
import { getOwnedAthlete } from '../../shared/ownership.ts';
import { handleAthletePlanReview } from '../../shared/athletePlanReview.ts';

// Legacy endpoint retained for authenticated owners. Preview only: no LLM,
// plan writes or use of a client-supplied TSB. A separate explicit approval
// through athletePlanReview is required for any single-session change.
Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me().catch(() => null);
  if (!user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const athlete = await getOwnedAthlete(base44, user.id);
  if (!athlete?.id || athlete.created_by_id !== user.id) {
    return Response.json({ error: 'Athlete not found' }, { status: 404 });
  }
  const body = await req.json().catch(() => null);
  if (!body?.session_id) return Response.json({
    error: 'Choose an upcoming session to review. No automatic changes were made.',
    approval_required: true,
  }, { status: 409 });
  return handleAthletePlanReview(base44,
    new Request(req.url, { method: 'POST', headers: req.headers,
      body: JSON.stringify({ action: 'preview', session_id: body.session_id }) }));
});