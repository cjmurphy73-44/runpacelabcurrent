import { describe, expect, it } from 'vitest';
import { assessStagingIsolation, ISOLATION_REQUIREMENTS } from '../../../base44/shared/stagingIsolationEvidence';
import { readFileSync } from 'node:fs';

const allVerified = Object.fromEntries(ISOLATION_REQUIREMENTS.map(key => [key, true]));

describe('Science 2.1: independent staging acceptance gate', () => {
  it('refuses to treat a distinct app name or ID as complete isolation', () => {
    expect(assessStagingIsolation({ distinctAppIds: true })).toMatchObject({
      ready: false,
    });
    expect(assessStagingIsolation({ distinctAppIds: true }).missing).toContain('independentDatabase');
    expect(assessStagingIsolation({ distinctAppIds: true }).missing).toContain('independentAuthTenant');
  });

  it('requires each boundary separately, including authenticated dev data', () => {
    for (const key of ISOLATION_REQUIREMENTS) {
      const result = assessStagingIsolation({ ...allVerified, [key]: false });
      expect(result.ready).toBe(false);
      expect(result.missing).toContain(key);
    }
  });

  it('fails closed for absent, null or unknown evidence', () => {
    expect(assessStagingIsolation({}).ready).toBe(false);
    expect(assessStagingIsolation({ ...allVerified, independentDatabase: undefined }).ready).toBe(false);
    expect(assessStagingIsolation({ ...allVerified, independentAuthTenant: null as never }).ready).toBe(false);
    expect(assessStagingIsolation({ ...allVerified, stableReadOnlyCounts: 'unknown' as never }).ready).toBe(false);
  });

  it('only approves fully independently verified evidence', () => {
    expect(assessStagingIsolation(allVerified)).toEqual({ ready: true, missing: [] });
  });

  it('documents the existing published-ID fallback and URL/storage overrides as unresolved hazards', () => {
    const source = readFileSync('src/lib/app-params.js', 'utf8');
    expect(source).toContain('PUBLISHED_APP_ID');
    expect(source).toContain('urlAppId');
    expect(source).toContain('localStorage');
    // This is a detection regression, not approval of the fallback.
    expect(assessStagingIsolation({ distinctAppIds: true }).ready).toBe(false);
  });
});
