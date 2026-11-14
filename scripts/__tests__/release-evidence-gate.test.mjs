import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateReleaseEvidence } from "../release-evidence-gate.mjs";

const sha = "a".repeat(40);
const other = "b".repeat(40);
const complete = {
  expectedSha: sha, mainSha: sha, validatedSha: sha, ci: "success",
  previewSha: sha, preview: "success", reviewApproved: true,
  publishApproved: true, base44SourceSha: sha, base44CheckpointId: "checkpoint-123",
  liveVerified: true, liveSourceSha: sha,
};
test("complete exact-SHA evidence is reconciled", () => {
  assert.deepEqual(evaluateReleaseEvidence(complete), { ready: true, blockers: [], expectedSha: sha });
});
test("missing and malformed evidence fails closed", () => {
  assert.equal(evaluateReleaseEvidence(null).ready, false);
  assert.equal(evaluateReleaseEvidence({ ...complete, expectedSha: "short" }).ready, false);
});
test("stale CI, preview, checkpoint and published source independently block readiness", () => {
  for (const key of ["mainSha", "validatedSha", "previewSha", "base44SourceSha", "liveSourceSha"]) {
    assert.equal(evaluateReleaseEvidence({ ...complete, [key]: other }).ready, false, key);
  }
});
test("failed or absent checks and missing human approvals block readiness", () => {
  for (const [key, value] of [
    ["ci", "pending"], ["preview", "failure"], ["reviewApproved", false],
    ["publishApproved", false], ["liveVerified", false], ["base44CheckpointId", ""],
  ]) assert.equal(evaluateReleaseEvidence({ ...complete, [key]: value }).ready, false, key);
});
