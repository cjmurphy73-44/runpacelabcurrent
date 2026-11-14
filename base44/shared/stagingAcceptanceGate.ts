import { assessTestExecutionMetadata, type TestExecutionMetadata } from './testExecutionMetadata';
import { assessTestAgentProvenance, type TestAgentProvenance } from './testAgentProvenance';
import { assessStagingFunctionRoutePair } from './stagingFunctionRoutePair';
import type { FunctionDeploymentEvidence } from './functionDeploymentEvidence';

/** Offline gate: a successful test, tenant attestation and BOTH function routes must agree. */
export function assessStagingAcceptance(e: {
  expectedAppId: string;
  expectedCommit: string;
  execution?: TestExecutionMetadata;
  provenance?: TestAgentProvenance;
  previewFunction?: FunctionDeploymentEvidence;
  publishedFunction?: FunctionDeploymentEvidence;
}) {
  const missing: string[] = [];
  const test = assessTestExecutionMetadata(e.execution, e.expectedAppId, e.expectedCommit);
  const tenant = assessTestAgentProvenance(e.provenance);
  const routes = assessStagingFunctionRoutePair(e.previewFunction, e.publishedFunction);
  for (const m of test.missing) missing.push(`execution:${m}`);
  for (const m of tenant.missing) missing.push(`tenant:${m}`);
  for (const m of routes.missing) missing.push(`routes:${m}`);
  if (e.provenance?.expectedAppId !== e.expectedAppId) missing.push('tenant:app-mismatch');
  if (e.previewFunction?.expectedAppId !== e.expectedAppId) missing.push('routes:preview-app-mismatch');
  if (e.publishedFunction?.expectedAppId !== e.expectedAppId) missing.push('routes:published-app-mismatch');
  return { ready: missing.length === 0, missing };
}
