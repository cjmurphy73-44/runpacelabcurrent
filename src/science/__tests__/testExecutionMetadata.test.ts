import { describe, expect, it } from 'vitest';
import { assessTestExecutionMetadata } from '../../../base44/shared/testExecutionMetadata';

const app = '6aefe9d09e2788fc8591c758';
const commit = '18cf83fa85d84c228d99ac38ecc3ea0159f80204';
const good = {
  app_id: app, app_commit_hash: commit, status: 'completed',
  goal_accomplished: true, failure_reason: null,
  site_url: 'https://preview-sandbox--6aefe9d09e2788fc8591c758.base44.app/Physiology',
};

describe('Science 2.7: read-only test execution metadata', () => {
  it('rejects the observed failed published-staging run', () => {
    const actual = { ...good, status: 'failed', goal_accomplished: false, failure_reason: 'platform',
      site_url: 'https://train-pace-lab-copy-8591c758.base44.app/Physiology' };
    expect(assessTestExecutionMetadata(actual, app, commit)).toMatchObject({
      completed: false, isolationProven: false,
      missing: expect.arrayContaining(['successful-execution', 'goal-not-accomplished', 'execution-failure']),
    });
  });
  it('rejects absent execution, wrong app and mismatched commit', () => {
    expect(assessTestExecutionMetadata(undefined, app, commit).completed).toBe(false);
    expect(assessTestExecutionMetadata({ ...good, app_id: '6a504ebe6a5a6d1be058226c' }, app, commit).missing).toContain('app-identity');
    expect(assessTestExecutionMetadata({ ...good, app_commit_hash: 'a'.repeat(40) }, app, commit).missing).toContain('sandbox-commit');
  });
  it('rejects unfinished execution and an untrusted origin', () => {
    expect(assessTestExecutionMetadata({ ...good, status: 'running' }, app, commit).completed).toBe(false);
    expect(assessTestExecutionMetadata({ ...good, site_url: 'https://base44.app.evil.example/Physiology' }, app, commit).missing).toContain('trusted-preview-url');
    expect(assessTestExecutionMetadata({ ...good, site_url: 'http://foo.base44.app/Physiology' }, app, commit).completed).toBe(false);
  });
  it('rejects published staging and unrelated Base44 hosts even on successful executions', () => {
    for (const site_url of [
      'https://train-pace-lab-copy-8591c758.base44.app/Physiology',
      'https://preview-sandbox--6a504ebe6a5a6d1be058226c.base44.app/Physiology',
      'https://other-app.base44.app/Physiology',
      'https://preview-sandbox--6aefe9d09e2788fc8591c758.base44.app.evil.example/',
      'https://user:pass@preview-sandbox--6aefe9d09e2788fc8591c758.base44.app/Physiology',
    ]) {
      expect(assessTestExecutionMetadata({ ...good, site_url }, app, commit).missing)
        .toContain('trusted-preview-url');
    }
  });
  it('never equates successful test execution with isolation proof', () => {
    expect(assessTestExecutionMetadata(good, app, commit)).toEqual({ completed: true, missing: [], isolationProven: false });
  });
});
