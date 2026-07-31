import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { athlete_id } = await req.json();
    if (!athlete_id) return Response.json({ error: 'athlete_id is required' }, { status: 400 });

    const result = await base44.functions.invoke('recalculateCTLATLTSB', { athlete_id });
    return Response.json(result.data);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});