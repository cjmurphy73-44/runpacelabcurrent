import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

// Public checkout return is not a payment confirmation. A forged ?plan= URL
// must never present confirmed payment or active entitlement copy.
const source = readFileSync(new URL('../src/pages/CheckoutSuccess.jsx', import.meta.url), 'utf8');

describe('public checkout return trust contract', () => {
  it('does not claim payment or subscription activation from a redirect', () => {
    expect(source).not.toMatch(/Payment confirmed|Your subscription is active|Your plan is unlocked|fully unlocked/);
    expect(source).toContain('A checkout redirect alone does not confirm payment');
  });

  it('labels plan details as information rather than entitlement', () => {
    expect(source).toContain('Selected plan information');
    expect(source).toContain('verified subscription');
  });
});
