/** Only explicit platform attestations can verify deployed function routing. */
export type FunctionDeploymentEvidence = {
  requestedAppId?: string;
  expectedAppId?: string;
  functionName?: string;
  sourceRevision?: string;
  deployedRevision?: string;
  effectiveAppId?: string;
  environment?: 'preview' | 'published';
  independentlyAttested?: boolean;
};

export function assessFunctionDeployment(e: FunctionDeploymentEvidence) {
  const missing: string[] = [];
  const id = (s?: string) => typeof s === 'string' && /^[a-f0-9]{24}$/i.test(s);
  if (!id(e.requestedAppId) || !id(e.expectedAppId) || e.requestedAppId !== e.expectedAppId) missing.push('requested-app-identity');
  if (!id(e.effectiveAppId) || e.effectiveAppId !== e.expectedAppId) missing.push('effective-app-identity');
  if (!e.functionName || !/^[A-Za-z][A-Za-z0-9]*$/.test(e.functionName)) missing.push('function-name');
  if (!e.sourceRevision || !e.deployedRevision || e.sourceRevision !== e.deployedRevision) missing.push('exact-deployment-revision');
  if (e.environment !== 'preview' && e.environment !== 'published') missing.push('environment');
  if (e.independentlyAttested !== true) missing.push('platform-attestation');
  return { ready: missing.length === 0, missing };
}
