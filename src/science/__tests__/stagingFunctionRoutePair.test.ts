import { describe, expect, it } from 'vitest';
import { assessStagingFunctionRoutePair } from '../../../base44/shared/stagingFunctionRoutePair';
import type { FunctionDeploymentEvidence } from '../../../base44/shared/functionDeploymentEvidence';

const appId = '6aefe9d09e2788fc8591c758';
const preview: FunctionDeploymentEvidence = {
  requestedAppId: appId, expectedAppId: appId, effectiveAppId: appId,
  functionName: 'calculateBanisterModel', sourceRevision: 'r1', deployedRevision: 'r1',
  environment: 'preview', independentlyAttested: true,
};
const published: FunctionDeploymentEvidence = { ...preview, environment: 'published' };

describe('Science 2.4: two-target function routing', () => {
  it('requires both independently attested targets', () => {
    expect(assessStagingFunctionRoutePair(preview, undefined).ready).toBe(false);
    expect(assessStagingFunctionRoutePair(undefined, published).ready).toBe(false);
    expect(assessStagingFunctionRoutePair(undefined, undefined).ready).toBe(false);
  });
  it('does not accept a published staging route as preview evidence', () => {
    expect(assessStagingFunctionRoutePair(published, published).missing).toContain('preview-environment');
    expect(assessStagingFunctionRoutePair(preview, preview).missing).toContain('published-environment');
  });
  it('rejects a stale published deployment despite a current preview revision', () => {
    expect(assessStagingFunctionRoutePair(preview, { ...published, deployedRevision: 'old' }).missing)
      .toContain('published:exact-deployment-revision');
  });
  it('rejects a cross-app fallback and inconsistent function names', () => {
    expect(assessStagingFunctionRoutePair(preview, { ...published, effectiveAppId: '6a504ebe6a5a6d1be058226c' }).ready).toBe(false);
    expect(assessStagingFunctionRoutePair(preview, { ...published, functionName: 'calculateTrainingLoad' }).missing)
      .toContain('function-name-mismatch');
  });
  it('does not accept one self-declared unattested deployment', () => {
    expect(assessStagingFunctionRoutePair(preview, { ...published, independentlyAttested: false }).missing)
      .toContain('published:platform-attestation');
  });
  it('only accepts both targets with exact and independently attested revisions', () => {
    expect(assessStagingFunctionRoutePair(preview, published)).toEqual({ ready: true, missing: [] });
  });
});
