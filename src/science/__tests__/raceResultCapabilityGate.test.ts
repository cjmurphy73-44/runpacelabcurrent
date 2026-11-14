import { describe, expect, it } from 'vitest';
import { RACE_RESULT_MUTATIONS_ENABLED, assessRaceResultMutationCapability } from '../../../base44/shared/raceResultCapabilityGate';

const verified = {
  authenticatedOwnerVerified: true,
  directClientWritesDenied: true,
  serviceRoleOwnerStampVerified: true,
  atomicUniqueRaceIdentityVerified: true,
  atomicCorrectionCasVerified: true,
  stagingIsolated: true,
};
describe('race result mutation safety gate', () => {
  it('defaults to disabled even if an operator asserts all checks', () => {
    expect(RACE_RESULT_MUTATIONS_ENABLED).toBe(false);
    expect(assessRaceResultMutationCapability(verified).allowed).toBe(false);
  });
  it('reports all missing capabilities when no evidence is supplied', () => {
    const result = assessRaceResultMutationCapability(null);
    expect(result.allowed).toBe(false);
    expect(result.blockers).toHaveLength(6);
  });
  it.each(Object.keys(verified))('reports unverified capability %s', key => {
    const result = assessRaceResultMutationCapability({ ...verified, [key]: false });
    expect(result.allowed).toBe(false);
    expect(result.blockers).toHaveLength(1);
  });
  it('does not accept truthy strings as proof', () => {
    const result = assessRaceResultMutationCapability({ ...verified, stagingIsolated: 'true' });
    expect(result.blockers).toContain('staging_isolation_unverified');
  });
});
