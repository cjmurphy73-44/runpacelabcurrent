import { describe, expect, it } from "vitest";
import { planCommitBlockReason } from "../planCommitGate";

describe("training plan commit safety gate", () => {
  it("blocks a current coach hold", () => {
    expect(planCommitBlockReason({ level: "hold", loading: false, error: null })).toMatch(/paused/);
  });
  it("blocks a failed or still-loading coach lookup rather than interpreting unknown as clearance", () => {
    expect(planCommitBlockReason({ level: "none", loading: true })).toMatch(/Confirm/);
    expect(planCommitBlockReason({ level: "none", error: "offline" })).toMatch(/Confirm/);
    expect(planCommitBlockReason(null)).toMatch(/Confirm/);
  });
  it("allows verified no-hold or caution states", () => {
    expect(planCommitBlockReason({ level: "none", loading: false, error: null })).toBeNull();
    expect(planCommitBlockReason({ level: "caution", loading: false, error: null })).toBeNull();
  });
});
