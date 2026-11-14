import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { assessFunctionDeployment } from '../../../base44/shared/functionDeploymentEvidence';

const id = '6aefe9d09e2788fc8591c758';
const valid = {
  requestedAppId: id, expectedAppId: id, effectiveAppId: id,
  functionName: 'calculateBanisterModel', sourceRevision: 'revision-1',
  deployedRevision: 'revision-1', environment: 'published' as const,
  independentlyAttested: true
};

describe('Science 2.3: deployed worker provenance', () => {
  it('rejects matching source without a platform attestation', () => {
    expect(assessFunctionDeployment({ ...valid, independentlyAttested: false }).missing).toContain('platform-attestation');
  });
  it('rejects mismatched, missing and stale deployed revisions', () => {
    for (const deployedRevision of ['old-revision', '', undefined]) {
      expect(assessFunctionDeployment({ ...valid, deployedRevision }).missing).toContain('exact-deployment-revision');
    }
  });
  it('rejects whitespace-only revisions even when both strings match', () => {
    for (const revision of [' ', String.fromCharCode(9), String.fromCharCode(10)]) {
      expect(assessFunctionDeployment({ ...valid, sourceRevision: revision, deployedRevision: revision }).missing)
        .toContain('exact-deployment-revision');
    }
  });
  it('rejects production app fallback and unverified runtime identity', () => {
    expect(assessFunctionDeployment({ ...valid, effectiveAppId: '6a504ebe6a5a6d1be058226c' }).ready).toBe(false);
    expect(assessFunctionDeployment({ ...valid, effectiveAppId: undefined }).ready).toBe(false);
    expect(assessFunctionDeployment({ ...valid, environment: undefined }).ready).toBe(false);
  });
  it('requires every boundary for success', () => {
    expect(assessFunctionDeployment(valid)).toEqual({ ready: true, missing: [] });
  });
  it('keeps both legacy handlers fail-closed in source even when request payload is absent', () => {
    for (const name of ['calculateBanisterModel', 'calculateTrainingLoad']) {
      const source = readFileSync(`base44/functions/${name}/entry.ts`, 'utf8');
      expect(source).toContain('LEGACY_CALCULATION_NOT_VALIDATED');
      expect(source).toContain('Deno.serve');
      expect(source).not.toMatch(/durationMinutes\s*[,}]|dailyTSSHistory\s*[,}]/);
    }
  });
});
