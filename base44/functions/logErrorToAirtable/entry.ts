// base44/functions/logErrorToAirtable/entry.ts
// Frontend crash reporter. PageErrorBoundary POSTs a render-crash payload here
// fire-and-forget; this function writes one User Error Reports record via the
// shared airtable connector. Public (no auth required) so unauthenticated users
// on the public app can still report a crash — the only side effect is a single
// Airtable row. Strict payload validation + size caps prevent abuse; the
// frontend dedup Set stops a render loop from hitting this at all.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { getAirtableToken, airtableCreate, TABLES, toISO } from '../../shared/airtableClient.ts';

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

    const stack = truncate(body.stack, 4000);
    const route = truncate(body.route, 300);
    const userEmail = body.userEmail ? truncate(String(body.userEmail), 200) : 'anonymous';
    const severity = body.severity === 'Critical' ? 'Critical' : 'High';

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