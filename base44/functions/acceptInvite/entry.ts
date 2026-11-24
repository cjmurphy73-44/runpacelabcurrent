import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Retire the old placeholder route while retaining a clear response for old clients.
Deno.serve(async (req: Request) => {
  const user = await createClientFromRequest(req).auth.me().catch(() => null);
  if (!user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  return Response.json({ error: 'Coach assignments require administrator review' }, { status: 410 });
});
