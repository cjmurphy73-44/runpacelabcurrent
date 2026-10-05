// base44/functions/logErrorToAirtable/entry.ts
// Frontend crash reporter. PageErrorBoundary POSTs a render-crash payload here
// fire-and-forget; this function writes one User Error Reports record via the
// shared airtable connector. Public (no auth required) so unauthenticated users
// on the public app can still report a crash — the only side effect is a single
// Airtable row. Strict payload validation + size caps + per-IP rate limiting
// prevent abuse; the frontend dedup Set stops a render loop from hitting this.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { getAirtableToken, airtableCreate, TABLES, toISO } from '../../shared/airtableClient.ts';
import { claimRateLimit } from '../../shared/rateLimit.ts';

function truncate(s: any, n: number): string {
  s = String(s ?? '');
  return s.length > n ? s.slice(0, n) + '…' : s;
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    const message = truncate(body.message, 2000);
    if (!message) return Response.json({ error: 'message required' }, { status: 400 });

    // Per-source rate limit: a single IP/client can send at most 20 crash reports
    // per 5 minutes. Prevents an error loop or a malicious caller from flooding
    // the Airtable table. (Frontend dedup also stops render loops.)
    const clientKey = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (!claimRateLimit(`errlog:${clientKey}`, 20, 5 * 60 * 1000)) {
      return Response.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const stack = truncate(body.stack, 4000);
    const route = truncate(body.route, 300);
    // If the caller supplies a real email, keep it; otherwise leave it anonymous
    // instead of labelling it "frontend-global" which misled triage.
    const userEmail = body.userEmail ? truncate(String(body.userEmail), 200) : 'anonymous';

    // Respect the caller's severity; only remap unknowns to Medium (the previous
    // code mapped everything except Critical to High, inflating severity).
    const raw = String(body.severity || '').toLowerCase();
    const severity = raw === 'critical' ? 'Critical' : raw === 'high' ? 'High' : raw === 'low' ? 'Low' : 'Medium';

    const description = [
      'Source: frontend',
      route ? `Route: ${route}` : null,
      `Message: ${message}`,
      stack ? `Stack:\n${stack}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    const token = await getAirtableToken(base44);
    await airtableCreate(token, TABLES.userErrorReports, {
      'Error Description': description,
      'User Contact Info': userEmail,
      'Severity Level': severity,
      'Status': 'New',
      'Date Reported': toISO(new Date().toISOString()),
    });

    return Response.json({ success: true });
  } catch (error) {
    // Swallow: a reporting failure must never propagate to the crashing page.
    console.warn('logErrorToAirtable failed:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}