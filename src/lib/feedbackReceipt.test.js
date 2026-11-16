import { readFileSync } from "node:fs";
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

// Guard the public receipt copy until support staffing and response SLAs are verified.
describe("support receipt copy is evidence-based", () => {
  it("does not promise an unverified response time", () => {
    const source = readFileSync(new URL("../pages/Support.jsx", import.meta.url), "utf8");
    expect(source).not.toContain("We'll get back to you soon");
    expect(source).not.toContain("our team will take a look");
    expect(source).toContain("A response time is not guaranteed.");
  });
});
