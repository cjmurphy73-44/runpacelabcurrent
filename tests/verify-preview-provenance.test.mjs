import { describe, expect, it } from "vitest";
import { verifyPreviewProvenance } from "../scripts/verify-preview-provenance.mjs";

const expectedSha = "e38b5e95e9bcdccaba69721f9d1aa7dd10682f1d";
const deployment = {
  state: "READY",
  target: null,
  meta: { githubCommitSha: expectedSha, githubCommitRef: "codex/rel-staging-identity-gate-20261114" },
};
describe("exact Vercel preview provenance", () => {
  it("accepts a synthetic ready preview at the exact SHA", () => {
    expect(verifyPreviewProvenance({ expectedSha, deployment })).toEqual({ ok: true, reason: "exact-ready-preview-sha" });
  });
  it.each([
    [{ expectedSha: "short", deployment }, "invalid-expected-sha"],
    [{ expectedSha, deployment: undefined }, "not-preview-deployment"],
    [{ expectedSha, deployment: { ...deployment, target: "production" } }, "not-preview-deployment"],
    [{ expectedSha, deployment: { ...deployment, state: "BUILDING" } }, "deployment-not-ready"],
    [{ expectedSha, deployment: { ...deployment, meta: { ...deployment.meta, githubCommitSha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" } } }, "commit-sha-mismatch"],
    [{ expectedSha, deployment: { ...deployment, meta: { githubCommitSha: expectedSha } } }, "missing-branch-provenance"],
  ])("rejects unsupported deployment provenance", (input, reason) => {
    expect(verifyPreviewProvenance(input)).toEqual({ ok: false, reason });
  });
});
