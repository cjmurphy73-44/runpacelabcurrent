/**
 * Classifies read-only Base44 test execution metadata.
 * A successful browser flow is not proof of isolated database/auth routing.
 * Independent environment attestation remains a separate acceptance gate.
 */
export type TestExecutionMetadata = {
  app_id?: string;
  status?: string;
  goal_accomplished?: boolean;
  failure_reason?: string | null;
  site_url?: string;
  app_commit_hash?: string;
};
export function assessTestExecutionMetadata(
  e: TestExecutionMetadata | undefined,
  expectedAppId: string,
  expectedCommit: string,
) {
  const missing: string[] = [];
  if (!e) return { completed: false, missing: ['execution-metadata'], isolationProven: false };
  if (!/^[a-f0-9]{24}$/i.test(expectedAppId) || e.app_id !== expectedAppId) missing.push('app-identity');
  if (!/^[a-f0-9]{40}$/i.test(expectedCommit) || e.app_commit_hash !== expectedCommit) missing.push('sandbox-commit');
  if (e.status !== 'completed' && e.status !== 'success') missing.push('successful-execution');
  if (e.goal_accomplished !== true) missing.push('goal-not-accomplished');
  if (e.failure_reason) missing.push('execution-failure');
  if (!e.site_url || !/^https:\/\/[^/?#]+\.base44\.app(?:[/?#]|$)/i.test(e.site_url)) missing.push('trusted-test-url');
  return { completed: missing.length === 0, missing, isolationProven: false };
}
