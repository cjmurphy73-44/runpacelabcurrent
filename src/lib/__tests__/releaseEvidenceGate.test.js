import { describe, it, expect } from 'vitest';
import { evaluateReleaseEvidence as check } from '../../lib/releaseEvidenceGate';
const sha = 'a'.repeat(40);
const good = () => ({
  candidateSha: sha,
  github: { protectedMain: true, mainSha: sha, ciSha: sha, ciStatus: 'success' },
  vercel: { target: 'production', state: 'READY', gitSha: sha, sourceRepo: 'cjmurphy73-44/runpacelabcurrent', domainVerified: true, domainDeploymentVerified: true },
  base44: { environment: 'production', appId: '6a504ebe6a5a6d1be058226c', checkpointSha: sha, publishedSha: sha, publishedVerified: true },
  acceptance: { stagingSha: sha, passed: true },
});
describe('exact source release evidence', () => {
  it('requires all explicit verified evidence', () => expect(check(good())).toEqual({ releasable: true, failures: [] }));
  it('rejects missing evidence', () => expect(check(null).releasable).toBe(false));
  it('rejects short SHA prefixes', () => expect(check({ ...good(), candidateSha: 'a'.repeat(8) }).releasable).toBe(false));
  it('rejects GitHub main drift', () => expect(check({ ...good(), github: { ...good().github, mainSha: 'b'.repeat(40) } }).releasable).toBe(false));
  it('rejects CI for a different commit', () => expect(check({ ...good(), github: { ...good().github, ciSha: 'b'.repeat(40) } }).releasable).toBe(false));
  it('rejects a READY preview as production', () => expect(check({ ...good(), vercel: { ...good().vercel, target: null } }).releasable).toBe(false));
  it('rejects a domain that has not been resolved to a deployment', () => expect(check({ ...good(), vercel: { ...good().vercel, domainDeploymentVerified: false } }).releasable).toBe(false));
  it('rejects wrong Vercel repo', () => expect(check({ ...good(), vercel: { ...good().vercel, sourceRepo: 'different/repo' } }).releasable).toBe(false));
  it('rejects Base44 ready-but-unpublished state', () => expect(check({ ...good(), base44: { ...good().base44, publishedVerified: false } }).releasable).toBe(false));
  it('rejects Base44 stale checkpoint', () => expect(check({ ...good(), base44: { ...good().base44, checkpointSha: '3'.repeat(40) } }).releasable).toBe(false));
  it('rejects staging at a different source SHA', () => expect(check({ ...good(), acceptance: { ...good().acceptance, stagingSha: 'b'.repeat(40) } }).releasable).toBe(false));
  it('rejects staging without acceptance', () => expect(check({ ...good(), acceptance: { ...good().acceptance, passed: false } }).releasable).toBe(false));
});
