import { assessFunctionDeployment, type FunctionDeploymentEvidence } from './functionDeploymentEvidence';

/**
 * A source tree or successful build is not a deployed-route attestation.
 * Require independent, exact-revision evidence for BOTH staging targets.
 * No network calls or athlete records.
 */
export function assessStagingFunctionRoutePair(
  preview: FunctionDeploymentEvidence | undefined,
  published: FunctionDeploymentEvidence | undefined,
) {
  const missing: string[] = [];
  if (!preview) missing.push('preview-route-evidence');
  if (!published) missing.push('published-route-evidence');
  if (preview && preview.environment !== 'preview') missing.push('preview-environment');
  if (published && published.environment !== 'published') missing.push('published-environment');
  if (preview && published) {
    if (preview.functionName !== published.functionName) missing.push('function-name-mismatch');
    if (preview.expectedAppId !== published.expectedAppId) missing.push('staging-app-mismatch');
  }
  if (preview) {
    for (const reason of assessFunctionDeployment(preview).missing) missing.push(`preview:${reason}`);
  }
  if (published) {
    for (const reason of assessFunctionDeployment(published).missing) missing.push(`published:${reason}`);
  }
  return { ready: missing.length === 0, missing };
}
