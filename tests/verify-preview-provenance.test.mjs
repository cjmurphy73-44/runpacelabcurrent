import { describe, expect, it } from "vitest";
import { verifyPreviewProvenance } from "../scripts/verify-preview-provenance.mjs";

const expectedSha = "e38b5e95e9bcdccaba69721f9d1aa7dd10682f1d";
const expectedBranch = "codex/rel-staging-identity-gate-20261114";
const deployment = {
  state: "READY",
  target: null,
  meta: {
    githubCommitSha: expectedSha,
    githubCommitRef: expectedBranch,
    githubOrg: "cjmurphy73-44",
    githubRepo: "runpacelabcurrent",
  },
};
const valid = { expectedSha, expectedBranch, deployment };

describe("exact Vercel preview provenance", () => {
  it("accepts a synthetic ready preview at the exact SHA, branch and repository", () => {
    expect(verifyPreviewProvenance(valid)).toEqual({ ok: true, reason: "exact-ready-preview-sha" });
  });
  it.each([
    [{ ...valid, expectedSha: "short" }, "invalid-expected-sha"],
    [{ ...valid, deployment: undefined }, "not-preview-deployment"],
    [{ ...valid, deployment: { ...deployment, target: "production" } }, "not-preview-deployment"],
    [{ ...valid, deployment: { ...deployment, state: "BUILDING" } }, "deployment-not-ready"],
    [{ ...valid, deployment: { ...deployment, meta: { ...deployment.meta, githubCommitSha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" } } }, "commit-sha-mismatch"],
    [{ ...valid, deployment: { ...deployment, meta: { githubCommitSha: expectedSha } } }, "branch-provenance-mismatch"],
    [{ ...valid, deployment: { ...deployment, meta: { ...deployment.meta, githubCommitRef: "main" } } }, "branch-provenance-mismatch"],
    [{ ...valid, deployment: { ...deployment, meta: { ...deployment.meta, githubOrg: "other-owner" } } }, "repository-provenance-mismatch"],
  ])("rejects unsupported deployment provenance", (input, reason) => {
    expect(verifyPreviewProvenance(input)).toEqual({ ok: false, reason });
  });
});
