import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Source-contract regression: this guards the UI/server trust boundary without
// invoking Base44 or Stripe. It is not a substitute for an isolated handler test.
const subscribe = readFileSync(resolve(process.cwd(), 'src/pages/Subscribe.jsx'), 'utf8');
const checkout = readFileSync(resolve(process.cwd(), 'base44/functions/stripeCheckout/entry.ts'), 'utf8');

describe('checkout identity provenance contract', () => {
  it('sends only the selected plan from the client', () => {
    expect(subscribe).toMatch(/functions\.invoke\(["']stripeCheckout["'],\s*\{\s*plan:\s*tier\s*\}\)/);
    expect(subscribe).not.toMatch(/user_id\s*:\s*user/);
    expect(subscribe).not.toMatch(/useAuth/);
  });

  it('derives customer identity from the authenticated server session', () => {
    expect(checkout).toMatch(/await\s+base44\.auth\.me\(\)/);
    expect(checkout).toMatch(/if\s*\(!user\)\s*return\s+Response\.json\([^;]*status:\s*401/s);
    expect(checkout).toMatch(/params\.append\(["']client_reference_id["'],\s*user\.id\)/);
    expect(checkout).toMatch(/params\.append\(["']metadata\[user_id\]["'],\s*user\.id\)/);
    expect(checkout).not.toMatch(/(?:body|reqBody|payload)\.user_id/);
  });
});
