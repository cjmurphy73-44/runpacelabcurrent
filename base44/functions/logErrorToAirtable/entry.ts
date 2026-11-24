import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { claimRateLimit } from '../../shared/rateLimit.ts';
import { readLimitedJson } from '../../shared/requestJson.ts';

// Preserve the client route while moving crash reporting to Base44 logs.
// A user-controlled report never spends Airtable connector credits.
Deno.serve(async (req: Request) => {
  const user = await createClientFromRequest(req).auth.me().catch(() => null);
  if (!user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
  const input = await readLimitedJson(req);
  if (typeof input?.message !== 'string' || !input.message.trim() || input.message.length > 2000) {
    return Response.json({ error: 'Invalid error report' }, { status: 400 });
  }
  if (!claimRateLimit(`frontend-error:${user.id}`, 5, 5 * 60_000)) {
    return Response.json({ error: 'Too many error reports' }, { status: 429 });
  }
  const route = typeof input.route === 'string' && /^\/[a-z0-9/_-]{0,299}$/i.test(input.route) ? '/' + input.route.split('/')[1] : undefined;
  // Browser exceptions may contain private data. Retain the route and error class.
  const errorClass = input.message.match(/^(TypeError|ReferenceError|RangeError|SyntaxError|Error)\b/)?.[0] ?? 'Error';
  console.warn(JSON.stringify({ event: 'frontend_error', errorClass, route }));
  return Response.json({ success: true });
});
