import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// Base44 runtime-only modules prevent direct Node execution of this entrypoint.
// This source-level regression protects the acknowledgement policy until an
// isolated Base44 integration harness is available.
const source = readFileSync(new URL('../../base44/functions/stripeWebhook/entry.ts', import.meta.url), 'utf8');
const ledgerWriter = source.match(/const logEvent = async \(outcome\) => \{([\s\S]*?)\n    \};/);

describe('Stripe event-ledger write acknowledgement', () => {
  it('awaits persistence before returning a successful acknowledgement', () => {
    expect(ledgerWriter).not.toBeNull();
    expect(ledgerWriter[1]).toMatch(/await sr\.entities\.WebhookEvent\.create\(/);
  });

  it('does not swallow persistence errors', () => {
    expect(ledgerWriter).not.toBeNull();
    expect(ledgerWriter[1]).not.toMatch(/catch\s*\(/);
    expect(ledgerWriter[1]).not.toMatch(/console\.warn/);
  });
});
