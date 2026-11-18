import { describe, expect, it } from "vitest";
import { evaluateReleaseEvidence, REQUIRED_GATES } from "../releaseEvidenceGate";

const sha = "a".repeat(40);
const valid = () => ({
  gitSha: sha,
  releaseHold: true,
  gates: Object.fromEntries(REQUIRED_GATES.map(gate => [gate, {
    status: "pass",
    gitSha: sha,
    evidenceUrl: "https://github.com/cjmurphy73-44/runpacelabcurrent/actions/runs/123",
    verifiedAt: "2026-11-19T00:00:00Z",
  }])),
});

describe("scoped evidence URLs", () => {
  it.each([
    "https://github.com/another-owner/another-repo/actions/runs/123",
    "https://github.com/cjmurphy73-44/runpacelabcurrent.evil.example/actions/runs/123",
    "https://github.com/cjmurphy73-44/runpacelabcurrent/issues/1",
    "https://github.com/cjmurphy73-44/runpacelabcurrent/actions/runs/123?token=secret",
    "https://random-preview.vercel.app/looks-good",
    "https://vercel.com/other/path",
    "https://github.com@evil.example/cjmurphy73-44/runpacelabcurrent/actions/runs/123",
  ])("rejects unrelated or ambiguous evidence URL %s", url => {
    const input = valid();
    input.gates.exactHeadCi.evidenceUrl = url;
    expect(evaluateReleaseEvidence(input).blockers).toContain("exactHeadCi: trusted evidence link missing");
  });
  it("accepts correctly scoped deployment record links for human review only", () => {
    const input = valid();
    input.gates.sourceMapping.evidenceUrl = "https://vercel.com/team/project/deployments/dpl_123";
    expect(evaluateReleaseEvidence(input, Date.parse("2026-11-19T01:00:00Z")).readyForReview).toBe(true);
  });
});

describe("offline release review evidence gate", () => {
  it("rejects absent, malformed and empty candidate records", () => {
    for (const input of [null, undefined, [], {}, { gates: [] }]) {
      expect(evaluateReleaseEvidence(input).readyForReview).toBe(false);
    }
  });
  it("accepts complete synthetic exact-head evidence only for review, not deployment", () => {
    expect(evaluateReleaseEvidence(valid(), Date.parse("2026-11-19T01:00:00Z"))).toEqual({ readyForReview: true, blockers: [] });
  });
  it.each(REQUIRED_GATES)("fails closed when %s is unknown", gate => {
    const input = valid();
    input.gates[gate].status = "unknown";
    expect(evaluateReleaseEvidence(input).blockers).toContain(`${gate}: no verified pass`);
  });
  it("rejects stale-head, unsupported links and absent timestamps", () => {
    const input = valid();
    input.gates.exactHeadCi.gitSha = "b".repeat(40);
    input.gates.isolatedBrowser.evidenceUrl = "https://example.org/unsupported";
    input.gates.sourceMapping.verifiedAt = "";
    expect(evaluateReleaseEvidence(input).blockers).toEqual(expect.arrayContaining([
      "exactHeadCi: evidence does not match exact head",
      "isolatedBrowser: trusted evidence link missing",
      "sourceMapping: UTC verification timestamp missing",
    ]));
  });
  it("rejects absent HOLD and abbreviated SHA even with all pass statuses", () => {
    const input = valid();
    input.releaseHold = false;
    input.gitSha = "abc123";
    expect(evaluateReleaseEvidence(input).readyForReview).toBe(false);
  });
});

describe("verification recency", () => {
  const reviewTime = Date.parse("2026-11-19T01:00:00Z");
  it.each(["2026-12-01T00:00:00Z", "2026-09-01T00:00:00Z", "2026-11-31T00:00:00Z"])("rejects future, stale or impossible timestamp %s", timestamp => {
    const input = valid();
    input.gates.exactHeadCi.verifiedAt = timestamp;
    expect(evaluateReleaseEvidence(input, reviewTime).blockers).toContain("exactHeadCi: stale, future or invalid verification time");
  });
  it("accepts fresh evidence at the specified review time", () => {
    expect(evaluateReleaseEvidence(valid(), reviewTime).readyForReview).toBe(true);
  });
});
