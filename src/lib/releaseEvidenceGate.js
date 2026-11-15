// Release evidence is explicitly environment-scoped. Never infer production
// publication from a GitHub merge, a READY preview, or a Base44 build status.
const SHA = /^[a-f0-9]{40}$/i;
const trustedSha = value => typeof value === 'string' && SHA.test(value);

export function evaluateReleaseEvidence(evidence) {
  const failures = [];
  if (!evidence || typeof evidence !== 'object') return { releasable: false, failures: ['missing_evidence'] };
  const { candidateSha, github, vercel, base44, acceptance } = evidence;
  if (!trustedSha(candidateSha)) failures.push('invalid_candidate_sha');
  if (!github?.protectedMain || !trustedSha(github.mainSha) || github.mainSha !== candidateSha) failures.push('github_main_unverified_or_mismatch');
  if (github?.ciSha !== candidateSha || github?.ciStatus !== 'success') failures.push('ci_not_success_at_candidate_sha');
  if (vercel?.target !== 'production' || vercel?.state !== 'READY' || vercel?.gitSha !== candidateSha ||
      vercel?.sourceRepo !== 'cjmurphy73-44/runpacelabcurrent' || vercel?.domainVerified !== true ||
      vercel?.domainDeploymentVerified !== true) failures.push('production_domain_deployment_unverified_or_mismatch');
  if (base44?.environment !== 'production' || base44?.appId !== '6a504ebe6a5a6d1be058226c' ||
      base44?.checkpointSha !== candidateSha || base44?.publishedSha !== candidateSha ||
      base44?.publishedVerified !== true) failures.push('base44_published_checkpoint_unverified_or_mismatch');
  if (acceptance?.stagingSha !== candidateSha || acceptance?.passed !== true) failures.push('staging_acceptance_unverified_or_mismatch');
  return { releasable: failures.length === 0, failures };
}
