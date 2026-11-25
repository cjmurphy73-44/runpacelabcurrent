import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { feedbackWasAccepted } from "../feedbackReceipt";

describe("beta feedback persistence receipt", () => {
  it("accepts only an explicit boolean success acknowledgement", () => {
    expect(feedbackWasAccepted({ data: { success: true } })).toBe(true);
    expect(feedbackWasAccepted({ success: true })).toBe(true);
    for (const response of [undefined, null, {}, { data: {} }, { success: "true" },
      { data: { success: 1 } }, { data: { success: false }, success: true },
      { data: { success: true }, success: false }, { data: { error: "failed" } }, []]) {
      expect(feedbackWasAccepted(response)).toBe(false);
    }
  });
  it("does not silently copy feedback or display raw backend errors", () => {
    const source = readFileSync(resolve(process.cwd(), "src/components/feedback/BetaFeedbackModal.jsx"), "utf8");
    expect(source).toContain("feedbackWasAccepted(res)");
    expect(source).not.toContain("navigator.clipboard");
    expect(source).not.toContain("res?.data?.error");
    expect(source).not.toContain("e?.message");
    expect(source).toContain("Your message is still here.");
  });
});
