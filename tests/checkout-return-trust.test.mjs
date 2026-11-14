import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

// Public checkout return is not a payment confirmation. A forged ?plan= URL
// must never present confirmed payment or active entitlement copy.
const source = readFileSync(resolve(process.cwd(), 'src/pages/CheckoutSuccess.jsx'), 'utf8');

describe('public checkout return trust contract', () => {
  it('does not claim payment or subscription activation from a redirect', () => {
    expect(source).not.toMatch(/Payment confirmed|Your subscription is active|Your plan is unlocked|fully unlocked/);
    expect(source).toContain('A checkout redirect alone does not confirm payment');
  });

  it('never substitutes Pro for a missing or forged plan query', () => {
    expect(source).not.toMatch(/:\s*["']pro["']\s*;/);
    expect(source).toContain('Object.prototype.hasOwnProperty.call(PLAN_DETAILS, planKey)');
    expect(source).toContain('{d && <section');
    expect(source).toContain(': null;');
  });

  it('labels plan details as information rather than entitlement', () => {
    expect(source).toContain('Selected plan information');
    expect(source).toContain('verified subscription');
  });
});
