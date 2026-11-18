import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { providerForBackfill } from '../../../base44/shared/backfillProviderGate.ts';

const source = readFileSync(resolve(process.cwd(), 'base44/functions/backfillTelemetry/entry.ts'), 'utf8');

describe('provider-specific original recording recovery', () => {
  it('allows only the originating provider for device sessions', () => {
    expect(providerForBackfill({ source_provider: 'coros' })).toBe('coros');
    expect(providerForBackfill({ source_provider: 'garmin' })).toBe('garmin');
  });
  it('fails closed for manual, other and unknown sessions', () => {
    for (const source_provider of ['manual', 'strava', '', 'other']) {
      expect(providerForBackfill({ source_provider })).toBeNull();
    }
    expect(providerForBackfill(null)).toBeNull();
  });
  it('does not run both provider refetchers for one session', () => {
    expect(source).toMatch(/const provider = providerForBackfill\(session\)/);
    expect(source).toMatch(/provider === 'garmin' \? \[garminFileFor\] : provider === 'coros' \? \[corosFileFor\] : \[\]/);
    expect(source).not.toMatch(/for \(const refetch of \[garminFileFor, corosFileFor\]\)/);
  });
});
