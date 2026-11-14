import { describe, expect, it } from "vitest";
import { verifyPreviewProvenance } from "../scripts/verify-preview-provenance.mjs";

const expectedSha = "e38b5e95e9bcdccaba69721f9d1aa7dd10682f1d";
const expectedBranch = "codex/rel-staging-identity-gate-20261114";\nconst deployment = {
  state: "READY",
  target: null,
  meta: { githubCommitSha: expectedSha, githubCommitRef: expectedBranch, githubOrg: "cjmurphy73-44", githubRepo: "runpacelabcurrent" },
};
describe("exact Vercel preview provenance", () => {
  it("accepts a synthetic ready preview at the exact SHA", () => {
    expect(verifyPreviewProvenance({ expectedSha, expectedBranch, deployment })).toEqual({ ok: true, reason: "exact-ready-preview-sha" });
  });
  it.each([
    [{ expectedSha: "short", expectedBranch, deployment }, "invalid-expected-sha"],
    [{ expectedSha, expectedBranch, deployment: undefined }, "not-preview-deployment"],
    [{ expectedSha, deployment: { ...deployment, target: "production" } }, "not-preview-deployment"],
    [{ expectedSha, deployment: { ...deployment, state: "BUILDING" } }, "deployment-not-ready"],
    [{ expectedSha, deployment: { ...deployment, meta: { ...deployment.meta, githubCommitSha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" } } }, "commit-sha-mismatch"],
    [{ expectedSha, deployment: { ...deployment, meta: { githubCommitSha: expectedSha } } }, "missing-branch-provenance"],
  ])("rejects unsupported deployment provenance", (input, reason) => {
    expect(verifyPreviewProvenance(input)).toEqual({ ok: false, reason });
  });
});
