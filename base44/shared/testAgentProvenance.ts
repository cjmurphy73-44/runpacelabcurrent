/**
 * Offline acceptance gate for Base44 test-agent environment provenance.
 * Browser login, a 200 HTML response and a separate app ID are insufficient.
 * The independent platform must attest effective app, data and auth routing.
 */
export type TestAgentProvenance = {
  requestedAppId?: string;
  expectedAppId?: string;
  effectiveAppId?: string;
  dataEnvironment?: 'isolated-test' | 'published' | 'unknown';
  authEnvironment?: 'isolated-test' | 'published' | 'unknown';
  temporaryUser?: boolean;
  independentlyAttested?: boolean;
  writesAuditable?: boolean;
};

export function assessTestAgentProvenance(e: TestAgentProvenance | undefined) {
  const missing: string[] = [];
  if (!e) return { ready: false, missing: ['test-agent-evidence'] };
  const id = (s?: string) => typeof s === 'string' && /^[a-f0-9]{24}$/i.test(s);
  if (!id(e.expectedAppId) || !id(e.requestedAppId) || e.requestedAppId !== e.expectedAppId) missing.push('requested-app-identity');
  if (!id(e.effectiveAppId) || e.effectiveAppId !== e.expectedAppId) missing.push('effective-app-identity');
  if (e.dataEnvironment !== 'isolated-test') missing.push('isolated-test-database');
  if (e.authEnvironment !== 'isolated-test') missing.push('isolated-test-auth');
  if (e.temporaryUser !== true) missing.push('temporary-user');
  if (e.independentlyAttested !== true) missing.push('platform-attestation');
  if (e.writesAuditable !== true) missing.push('zero-write-audit');
  return { ready: missing.length === 0, missing };
}
