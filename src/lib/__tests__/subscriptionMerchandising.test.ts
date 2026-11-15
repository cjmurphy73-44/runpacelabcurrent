import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// Commercial trust regression: editorial selection must never be presented
// as measured customer popularity without a verified data source.
const subscribeSource = readFileSync(new URL('../../pages/Subscribe.jsx', import.meta.url), 'utf8');

describe('subscription plan merchandising claims', () => {
  it('labels the editorial highlight as featured, not as customer popularity', () => {
    expect(subscribeSource).toContain('>Featured plan</span>');
    expect(subscribeSource).not.toMatch(/most popular|best.?selling|#1 choice/i);
  });
  it('keeps the featured badge conditional rather than applying it to every tier', () => {
    expect(subscribeSource).toContain('{d.highlighted &&');
  });
});
