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

describe("offline release review evidence gate", () => {
  it("rejects absent, malformed and empty candidate records", () => {
    for (const input of [null, undefined, [], {}, { gates: [] }]) {
      expect(evaluateReleaseEvidence(input).readyForReview).toBe(false);
    }
  });
  it("accepts complete synthetic exact-head evidence only for review, not deployment", () => {
    expect(evaluateReleaseEvidence(valid())).toEqual({ readyForReview: true, blockers: [] });
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
