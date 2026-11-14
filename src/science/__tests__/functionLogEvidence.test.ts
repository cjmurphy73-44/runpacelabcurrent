import { describe, expect, it } from 'vitest';
import { summarizeFunctionLogEvidence } from '../../../base44/shared/functionLogEvidence';

const staging = '6aefe9d09e2788fc8591c758';
const opts = { appId: staging, expectedAppId: staging, env: 'prod' as const, since: '2026-11-15T00:00:00Z' };

describe('Science 2.2: function log provenance', () => {
  it('does not call an old bundled error a current deployment failure', () => {
    const r = summarizeFunctionLogEvidence([{ time: '2026-11-14T10:43:19Z', level: 'error', message: 'Cannot destructure durationMinutes' }], opts);
    expect(r).toMatchObject({ verified: true, reason: 'NO_RECENT_ERRORS_OBSERVED', matching: 0, stale: 1 });
  });
  it('counts only recent error lines', () => {
    expect(summarizeFunctionLogEvidence([
      { time: '2026-11-15T00:00:01Z', level: 'error' },
      { time: '2026-11-15T00:00:01Z', level: 'info' },
      { time: 'bad', level: 'error' }
    ], opts)).toMatchObject({ matching: 1, stale: 1, reason: 'RECENT_ERRORS' });
  });
  it('fails closed on a different app identity or invalid cutoff', () => {
    expect(summarizeFunctionLogEvidence([], { ...opts, appId: '6a504ebe6a5a6d1be058226c' }).verified).toBe(false);
    expect(summarizeFunctionLogEvidence([], { ...opts, since: 'invalid' }).verified).toBe(false);
  });
  it('does not treat empty logs as proof of a healthy deployment', () => {
    expect(summarizeFunctionLogEvidence([], opts)).toMatchObject({ verified: true, reason: 'NO_RECENT_ERRORS_OBSERVED', matching: 0 });
  });
});
