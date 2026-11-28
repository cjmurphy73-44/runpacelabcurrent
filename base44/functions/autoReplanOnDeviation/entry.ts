import { createClientFromRequest } from 'npm:@base44/sdk@0.8.63';
import { getOwnedAthlete, isRecordId } from '../../shared/ownership.ts';

// Previously this endpoint silently changed training sessions after workout
// deviations. The Sprint 4 contract is review-first and athlete-owned.
// The client no longer invokes this automatically. This compatibility route
// has ZERO writes, AI calls, notification sends or plan modifications.
Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me().catch(() => null);
  if (!user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const input = await req.json().catch(() => null);
  if (!isRecordId(input?.session_id)) return Response.json({ error: 'session_id required' }, { status: 400 });
  const athlete = await getOwnedAthlete(base44, user.id);
  if (!athlete?.id || athlete.created_by_id !== user.id) {
    return Response.json({ error: 'Athlete not found' }, { status: 404 });
  }
  const session = await base44.asServiceRole.entities.TrainingPlanSession.get(input.session_id).catch(() => null);
  if (!session || session.athlete_id !== athlete.id) return Response.json({ error: 'Session not found' }, { status: 404 });
  return Response.json({
    approval_required: true, adjusted: [],
    summary: 'Your completed workout was recorded. Any future plan change requires your review and approval.',
  }, { headers: { 'Cache-Control': 'private, no-store' } });
});
