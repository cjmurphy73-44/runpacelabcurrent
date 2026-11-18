/**
 * Offline, fail-closed release evidence evaluator.
 * A passing result is a review prerequisite, never authorization to deploy.
 * Do not supply production secrets, personal records or customer data.
 */
export const REQUIRED_GATES = Object.freeze([
  "exactHeadCi", "isolatedBrowser", "sourceMapping", "providerProvenance",
  "privacyTwoAccount", "coachSafety", "billingEntitlements", "pricingTerms",
  "supportRollback",
]);

const SHA = /^[a-f0-9]{40}$/;
const VALID_EVIDENCE = /^https:\/\/(github\.com|api\.github\.com|vercel\.com|[a-z0-9-]+\.vercel\.app)\//i;

export function evaluateReleaseEvidence(candidate) {
  const blockers = [];
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    return { readyForReview: false, blockers: ["candidate: missing or malformed"] };
  }
  if (!SHA.test(candidate.gitSha ?? "")) blockers.push("gitSha: full 40-character commit required");
  if (candidate.releaseHold !== true) blockers.push("releaseHold: explicit HOLD required");
  const gates = candidate.gates;
  if (!gates || typeof gates !== "object" || Array.isArray(gates)) {
    blockers.push("gates: missing or malformed");
  }
  for (const gate of REQUIRED_GATES) {
    const item = gates && !Array.isArray(gates) ? gates[gate] : undefined;
    if (!item || item.status !== "pass") {
      blockers.push(`${gate}: no verified pass`);
      continue;
    }
    if (typeof item.evidenceUrl !== "string" || !VALID_EVIDENCE.test(item.evidenceUrl)) {
      blockers.push(`${gate}: trusted evidence link missing`);
    }
    if (typeof item.verifiedAt !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(item.verifiedAt) || !Number.isFinite(Date.parse(item.verifiedAt))) {
      blockers.push(`${gate}: UTC verification timestamp missing`);
    }
    if (item.gitSha !== candidate.gitSha) blockers.push(`${gate}: evidence does not match exact head`);
  }
  return { readyForReview: blockers.length === 0, blockers };
}
