// The previous legacy handler used an unsupported runtime and did not
// establish complete history, consistent units or athlete-local dates.
// Its calculation code remains in repository history and science modules.
// Fail closed instead of producing unverified training-load outputs.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
  const client = createClientFromRequest(req);
  const user = await client.auth.me().catch(() => null);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  return Response.json({ success: false, code: 'LEGACY_CALCULATION_NOT_VALIDATED',
    error: 'Use the verified science preview. This legacy calculation endpoint is unavailable.' }, { status: 503 });
});
