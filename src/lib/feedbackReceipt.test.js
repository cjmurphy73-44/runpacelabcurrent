import { describe, expect, it } from "vitest";
import { isConfirmedFeedbackReceipt } from "./feedbackReceipt";

describe("support feedback persistence acknowledgement", () => {
  it("accepts only a saved record id and explicit success", () => {
    expect(isConfirmedFeedbackReceipt({ data: { success: true, id: "synthetic-id" } })).toBe(true);
  });

  it.each([
    undefined, null, {}, { data: undefined }, { data: {} },
    { data: { success: true } },
    { data: { success: true, id: "" } },
    { data: { success: true, id: "  " } },
    { data: { success: true, id: 123 } },
    { data: { success: false, id: "synthetic-id" } },
    { data: { success: true, id: "synthetic-id", error: "failed" } },
    { data: { success: true, id: "synthetic-id", error: "" } },
    { data: { success: true, id: "synthetic-id", error: null } },
    { data: { success: true, id: "synthetic-id", error: false } },
    { data: { success: true, id: "synthetic-id", error: 0 } },
    { error: "network failed" },
  ])("fails closed for unconfirmed result %#", (response) => {
    expect(isConfirmedFeedbackReceipt(response)).toBe(false);
  });
});
