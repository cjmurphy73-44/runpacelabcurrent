import { describe, expect, it } from "vitest";
import { evaluateGitHubReleaseAudit } from "../../../scripts/release-audit-evidence.mjs";

const sha = "a".repeat(40);
const good = { expectedSha: sha, mainSha: sha, checks: [{ state: "success" }], workflows: [{ status: "completed", conclusion: "success" }] };
describe("manual release audit evidence", () => {
  it("accepts only matching main SHA and completed successful CI for human review", () => {
    expect(evaluateGitHubReleaseAudit(good)).toMatchObject({ readyForHumanReview: true });
  });
  it("rejects missing, malformed or mismatched commit", () => {
    for (const patch of [{ expectedSha: "main" }, { mainSha: "b".repeat(40) }, { mainSha: undefined }]) {
      expect(evaluateGitHubReleaseAudit({ ...good, ...patch }).readyForHumanReview).toBe(false);
    }
  });
  it("rejects absent or unsuccessful CI evidence", () => {
    for (const patch of [
      { checks: [], workflows: [] }, { workflows: [] },
      { checks: [{ state: "failure" }] }, { workflows: [{ status: "queued", conclusion: null }] },
    ]) expect(evaluateGitHubReleaseAudit({ ...good, ...patch }).readyForHumanReview).toBe(false);
  });
  it("never claims a deployment or live source is verified", () => {
    const result = evaluateGitHubReleaseAudit(good);
    expect(result.readyForHumanReview).toBe(true);
    expect(result.reason).toContain("NOT verified");
  });
});
