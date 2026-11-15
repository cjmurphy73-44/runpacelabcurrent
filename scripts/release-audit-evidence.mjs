// Pure audit of read-only GitHub evidence. Never authorizes a release.
export function evaluateGitHubReleaseAudit({ expectedSha, mainSha, checks, workflows }) {
  const SHA = /^[a-f0-9]{40}$/i;
  const fail = reason => ({ readyForHumanReview: false, reason });
  if (![expectedSha, mainSha].every(x => typeof x === "string" && SHA.test(x))) return fail("Invalid or missing commit SHA");
  if (expectedSha.toLowerCase() !== mainSha.toLowerCase()) return fail("Main branch does not match requested commit");
  if (!Array.isArray(checks) || !Array.isArray(workflows)) return fail("Missing check evidence");
  if (checks.length === 0 && workflows.length === 0) return fail("No CI evidence");
  if (checks.some(c => c?.state !== "success") ||
      workflows.some(w => w?.conclusion !== "success" || w?.status !== "completed")) return fail("Incomplete or failed checks");
  if (workflows.length === 0) return fail("No completed GitHub Actions run");
  return {
    readyForHumanReview: true,
    reason: "GitHub main and CI evidence matched; deployment and live source NOT verified",
  };
}
