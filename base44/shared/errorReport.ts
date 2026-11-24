import { claimRateLimit } from './rateLimit.ts';

// Keep request-path failures in Base44 logs. Errors triggered by requests are
// never forwarded as paid Airtable writes.
export async function reportError(
  _base44: unknown,
  opts: {
    source: string;
    message: string;
    route?: string;
    stack?: string;
    userEmail?: string;
    severity?: 'Medium' | 'High' | 'Critical';
  },
): Promise<{ deduped: boolean }> {
  if (!claimRateLimit(`backend-error:${opts.source}`, 10, 5 * 60_000)) return { deduped: true };
  const code = opts.stack?.match(/^(TypeError|ReferenceError|RangeError|SyntaxError|Error)\b/)?.[0] ?? 'Error';
  console.error(JSON.stringify({ event: 'backend_error', source: opts.source, severity: opts.severity ?? 'Medium', code }));
  return { deduped: false };
}
