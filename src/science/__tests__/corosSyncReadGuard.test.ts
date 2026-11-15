import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Regression guard for the Base44 sync integration: a truncated initial
// duplicate lookup must stop writes before the bulk-create call.
const source = readFileSync(resolve(process.cwd(), 'base44/functions/corosSync/entry.ts'), 'utf8');

describe('COROS sync duplicate lookup safety', () => {
  it('rejects an incomplete initial lookup before selecting activities to create', () => {
    const guard = source.indexOf("existingRows.length >= 500");
    const selection = source.indexOf("const toCreate = []");
    const write = source.indexOf("const write = await persistCorosBatches");
    expect(guard).toBeGreaterThan(0);
    expect(selection).toBeGreaterThan(guard);
    expect(write).toBeGreaterThan(selection);
    expect(source).toContain('COROS duplicate check incomplete; no new activities written');
  });

  it('does not automatically retry uncertain writes', () => {
    expect(source).toContain('reconcileCorosWrites(toCreate');
    expect(source).toContain('Never automatically retry on this request');
  });
});
