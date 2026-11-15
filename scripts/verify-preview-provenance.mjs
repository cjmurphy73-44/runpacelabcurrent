// Read-only comparison of GitHub PR head and Vercel deployment metadata.
// No credentials, network requests, SDK initialization, or athlete data.
export function verifyPreviewProvenance({ expectedSha, expectedBranch, expectedRepository = "cjmurphy73-44/runpacelabcurrent", deployment } = {}) {
  const sha = typeof expectedSha === "string" ? expectedSha.trim() : "";
  if (!/^[a-f0-9]{40}$/i.test(sha)) return { ok: false, reason: "invalid-expected-sha" };
  if (!deployment || deployment.target === "production") return { ok: false, reason: "not-preview-deployment" };
  if (deployment.state !== "READY") return { ok: false, reason: "deployment-not-ready" };
  const actual = deployment.meta?.githubCommitSha;
  if (typeof actual !== "string" || actual.toLowerCase() !== sha.toLowerCase()) return { ok: false, reason: "commit-sha-mismatch" };
  if (!expectedBranch || deployment.meta?.githubCommitRef !== expectedBranch) return { ok: false, reason: "branch-provenance-mismatch" };
  const repo = `${deployment.meta?.githubOrg || ""}/${deployment.meta?.githubRepo || ""}`;
  if (repo.toLowerCase() !== expectedRepository.toLowerCase()) return { ok: false, reason: "repository-provenance-mismatch" };
  return { ok: true, reason: "exact-ready-preview-sha" };
}
