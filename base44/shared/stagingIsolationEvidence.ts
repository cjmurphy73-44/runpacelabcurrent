/**
 * Science 2.1: acceptance gate for independently established Base44 isolation.
 * These are evidence flags, not inferred from URLs, counts or app labels.
 * The caller must only set a flag true after verifying that exact boundary.
 */
export type StagingIsolationEvidence = {
  distinctAppIds: boolean;
  effectiveBackendOrigins: boolean;
  independentDatabase: boolean;
  independentAuthTenant: boolean;
  independentFunctionRouting: boolean;
  authenticatedPreviewDevData: boolean;
  stableReadOnlyCounts: boolean;
};

export const ISOLATION_REQUIREMENTS: readonly (keyof StagingIsolationEvidence)[] = [
  'distinctAppIds',
  'effectiveBackendOrigins',
  'independentDatabase',
  'independentAuthTenant',
  'independentFunctionRouting',
  'authenticatedPreviewDevData',
  'stableReadOnlyCounts',
];

export function assessStagingIsolation(evidence: Partial<StagingIsolationEvidence>) {
  const missing = ISOLATION_REQUIREMENTS.filter(key => evidence[key] !== true);
  return { ready: missing.length === 0, missing };
}
