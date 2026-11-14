import { describe, expect, it } from 'vitest';
import { assessStagingAcceptance } from '../../../base44/shared/stagingAcceptanceGate';

const app = '6aefe9d09e2788fc8591c758';
const commit = '18cf83fa85d84c228d99ac38ecc3ea0159f80204';
const route = {
  requestedAppId: app, expectedAppId: app, effectiveAppId: app,
  functionName: 'reviewRestDays', sourceRevision: 'r1', deployedRevision: 'r1',
  independentlyAttested: true,
};
const good = {
  expectedAppId: app, expectedCommit: commit,
  execution: {
    app_id: app, app_commit_hash: commit, status: 'completed',
    goal_accomplished: true, failure_reason: null,
    site_url: `https://preview-sandbox--${app}.base44.app/Physiology`,
  },
  provenance: {
    requestedAppId: app, expectedAppId: app, effectiveAppId: app,
    dataEnvironment: 'isolated-test' as const, authEnvironment: 'isolated-test' as const,
    temporaryUser: true, independentlyAttested: true, writesAuditable: true,
  },
  previewFunction: { ...route, environment: 'preview' as const },
  publishedFunction: { ...route, environment: 'published' as const },
};

describe('Science 2.9: joined staging acceptance gate', () => {
  it('rejects a successful execution without independent tenant evidence', () => {
    expect(assessStagingAcceptance({ ...good, provenance: undefined }).missing)
      .toContain('tenant:test-agent-evidence');
  });
  it('rejects complete tenant evidence without deployed route evidence', () => {
    expect(assessStagingAcceptance({ ...good, publishedFunction: undefined }).missing)
      .toContain('routes:published-route-evidence');
  });
  it('rejects a platform-failed execution despite other attestations', () => {
    expect(assessStagingAcceptance({ ...good, execution: { ...good.execution, status: 'failed' } }).ready).toBe(false);
  });
  it('rejects cross-app evidence even when each sub-gate is internally consistent', () => {
    const other = '6a504ebe6a5a6d1be058226c';
    const provenance = { ...good.provenance, requestedAppId: other, expectedAppId: other, effectiveAppId: other };
    expect(assessStagingAcceptance({ ...good, provenance }).missing).toContain('tenant:app-mismatch');
    const previewFunction = { ...good.previewFunction, requestedAppId: other, expectedAppId: other, effectiveAppId: other };
    expect(assessStagingAcceptance({ ...good, previewFunction }).missing).toContain('routes:preview-app-mismatch');
  });
  it('rejects a published staging browser URL even with otherwise complete evidence', () => {
    const execution = { ...good.execution, site_url: 'https://train-pace-lab-copy-8591c758.base44.app/Physiology' };
    expect(assessStagingAcceptance({ ...good, execution }).missing).toContain('execution:trusted-preview-url');
  });
  it('only accepts complete, aligned synthetic attestations', () => {
    expect(assessStagingAcceptance(good)).toEqual({ ready: true, missing: [] });
  });
});
