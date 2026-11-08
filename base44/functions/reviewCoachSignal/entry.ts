import { createClientFromRequest } from 'npm:@base44/sdk@0.8.59';
import { coachSignalReview } from '../../shared/coachSignalReview.ts';

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405, headers: { Allow: 'POST' } });
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    let body;
    try { body = await req.json(); } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }
    return await coachSignalReview(base44, user, body);
  } catch {
    return Response.json({ error: 'Could not check or save the conversation review. Please retry.' }, { status: 503 });
  }
});
