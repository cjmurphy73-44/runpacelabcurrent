import { test, expect } from "vitest";
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
  expect(evaluateReleaseEvidence(complete)).toEqual({ ready: true, blockers: [], expectedSha: sha });
});
test("missing and malformed evidence fails closed", () => {
  expect(evaluateReleaseEvidence(null).ready).toBe(false);
  expect(evaluateReleaseEvidence({ ...complete, expectedSha: "short" }).ready).toBe(false);
});
test("stale CI, preview, checkpoint and published source independently block readiness", () => {
  for (const key of ["mainSha", "validatedSha", "previewSha", "base44SourceSha", "liveSourceSha"]) {
    expect(evaluateReleaseEvidence({ ...complete, [key]: other }).ready).toBe(false);
  }
});
test("failed or absent checks and missing human approvals block readiness", () => {
  for (const [key, value] of [
    ["ci", "pending"], ["preview", "failure"], ["reviewApproved", false],
    ["publishApproved", false], ["liveVerified", false], ["base44CheckpointId", ""],
  ]) expect(evaluateReleaseEvidence({ ...complete, [key]: value }).ready).toBe(false);
});
