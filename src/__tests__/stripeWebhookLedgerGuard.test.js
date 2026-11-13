import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// Source-level safety regression for the Base44/Deno entrypoint, which cannot
// be imported directly into Node because of its runtime-only module specifiers.
const source = readFileSync(new URL('../../base44/functions/stripeWebhook/entry.ts', import.meta.url), 'utf8');

const ledgerLookup = source.match(/const eventId = `stripe:\$\{event\.id\}`;([\s\S]*?)const provision =/);

describe('Stripe webhook event-ledger read failure', () => {
  it('retains event-id duplicate lookup before provisioning', () => {
    expect(ledgerLookup).not.toBeNull();
    expect(ledgerLookup[1]).toMatch(/WebhookEvent\.filter\(\{ event_id: eventId \}\)/);
    expect(ledgerLookup[1]).toMatch(/if \(seen\.length > 0\) return Response\.json\(\{ received: true, duplicate: true \}\)/);
  });

  it('rejects an unavailable deduplication ledger with retryable 503 instead of failing open', () => {
    expect(ledgerLookup).not.toBeNull();
    expect(ledgerLookup[1]).toMatch(/catch \(e\) \{[\s\S]*?return Response\.json\(\{ error: "Webhook event ledger unavailable" \}, \{ status: 503 \}\)/);
    expect(ledgerLookup[1]).not.toMatch(/fail open/i);
  });
});
