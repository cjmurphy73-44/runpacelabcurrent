// base44/functions/webhookWearableSync/entry.ts
// Hardened wearable-telemetry webhook receiver. Authenticates inbound pushes with a
// shared secret (WEBHOOK_SYNC_SECRET) compared in constant time, so forged requests
// can't ingest workouts or burn downstream AI credits. The secret is the trust
// boundary; without it the receiver refuses to process anything.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { constantTimeEqual } from '../../shared/crypto.ts';

/** Helper to block SSRF attempts against internal/private network ranges. */
function assertSafeUrl(targetUrl: string): void {
  const parsed = new URL(targetUrl);
  const hostname = parsed.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname.startsWith('127.')) {
    throw new Error('SSRF Blocked: Localhost access prohibited');
  }
  const parts = hostname.split('.').map(Number);
  if (parts.length === 4 && !parts.some(isNaN)) {
    const [a, b] = parts;
    if (a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254)) {
      throw new Error('SSRF Blocked: Private network IP range prohibited');
    }
  }
}

export default async function (req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Verify the shared-secret signature header in constant time. The secret is required —
  // an unset WEBHOOK_SYNC_SECRET makes the receiver refuse all pushes rather than fail open.
  const secret = Deno.env.get('WEBHOOK_SYNC_SECRET') || '';
  const signature = req.headers.get('x-webhook-signature') || req.headers.get('garmin-signature') || '';
  if (!secret || !signature || !constantTimeEqual(signature, secret)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();

    // If the payload contains any outbound callback URLs, validate them for SSRF.
    if (body?.callbackUrl) assertSafeUrl(body.callbackUrl);

    // Acknowledge the push. Full ingest wiring (parse + dedup + session create) is added
    // when a provider is connected to this endpoint; the secret gate above is the security
    // boundary that must hold regardless.
    return new Response(JSON.stringify({ success: true, received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Invalid webhook request' }), {
      status: err?.message?.includes('SSRF') ? 403 : 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}