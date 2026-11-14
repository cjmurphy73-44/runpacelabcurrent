import { describe, expect, it } from 'vitest';
import { assessTestAgentProvenance } from '../../../base44/shared/testAgentProvenance';

const staging = '6aefe9d09e2788fc8591c758';
const good = {
  requestedAppId: staging, expectedAppId: staging, effectiveAppId: staging,
  dataEnvironment: 'isolated-test' as const,
  authEnvironment: 'isolated-test' as const,
  temporaryUser: true, independentlyAttested: true, writesAuditable: true,
};

describe('Science 2.6: Base44 temporary test-agent provenance', () => {
  it('rejects missing evidence and published-host-only proof', () => {
    expect(assessTestAgentProvenance(undefined).ready).toBe(false);
    expect(assessTestAgentProvenance({ requestedAppId: staging, expectedAppId: staging }).ready).toBe(false);
  });
  it('rejects production app routing even if other claims are true', () => {
    expect(assessTestAgentProvenance({ ...good, effectiveAppId: '6a504ebe6a5a6d1be058226c' }).missing)
      .toContain('effective-app-identity');
  });
  it('rejects published database or auth tenant for a temporary test user', () => {
    expect(assessTestAgentProvenance({ ...good, dataEnvironment: 'published' }).missing)
      .toContain('isolated-test-database');
    expect(assessTestAgentProvenance({ ...good, authEnvironment: 'published' }).missing)
      .toContain('isolated-test-auth');
  });
  it('rejects unknown environments, absent audit and unauthenticated user', () => {
    expect(assessTestAgentProvenance({ ...good, dataEnvironment: 'unknown' }).ready).toBe(false);
    expect(assessTestAgentProvenance({ ...good, writesAuditable: false }).ready).toBe(false);
    expect(assessTestAgentProvenance({ ...good, temporaryUser: false }).ready).toBe(false);
  });
  it('rejects unsupported self-declared isolation without platform attestation', () => {
    expect(assessTestAgentProvenance({ ...good, independentlyAttested: false }).missing)
      .toContain('platform-attestation');
  });
  it('requires all independent conditions', () => {
    expect(assessTestAgentProvenance(good)).toEqual({ ready: true, missing: [] });
  });
});
