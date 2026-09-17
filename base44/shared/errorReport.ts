// base44/shared/errorReport.ts
// Server-side error → Airtable reporter. Called from backend-function catch
// blocks (the ones that return a genuine 500) to log the failure into the User
// Error Reports table. Fetches the Airtable connector token in-process (no HTTP
// hop) and applies a short in-memory TTL dedup keyed by source+message+route so
// retries within ~5 minutes don't spam the table.
//
// Fire-and-forget by contract: every caller wraps reportError in try/catch so a
// logging failure never breaks the originating flow. 400/401 validation returns
// are NOT reported here — only genuine 500s.

import { getAirtableToken, airtableCreate, TABLES, toISO } from './airtableClient.ts';

const DEDUP_TTL_MS = 5 * 60 * 1000;
const recent = new Map<string, number>();

function signature(opts: { source: string; message: string; route?: string }): string {
  return [opts.source || '', opts.message || '', opts.route || ''].join('|');
}

export async function reportError(
  base44: any,
  opts: {
    source: string;
    message: string;
    route?: string;
    stack?: string;
    userEmail?: string;
    severity?: 'Medium' | 'High' | 'Critical';
  }
): Promise<{ deduped: boolean }> {
  const sig = signature(opts);
  const now = Date.now();
  const last = recent.get(sig);
  if (last && now - last < DEDUP_TTL_MS) return { deduped: true };
  recent.set(sig, now);
  // light gc so the map can't grow unbounded across a long-lived worker
  if (recent.size > 200) {
    for (const [k, t] of recent) if (now - t > DEDUP_TTL_MS) recent.delete(k);
  }

  const description = [
    `Source: ${opts.source || 'unknown'}`,
    opts.route ? `Route: ${opts.route}` : null,
    `Message: ${opts.message || ''}`,
    opts.stack ? `Stack:\n${opts.stack}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const fields = {
    'Error Description': description,
    'User Contact Info': opts.userEmail || 'anonymous',
    'Severity Level': opts.severity || 'Medium',
    'Status': 'New',
    'Date Reported': toISO(new Date().toISOString()),
  };

  const token = await getAirtableToken(base44);
  await airtableCreate(token, TABLES.userErrorReports, fields);
  return { deduped: false };
}