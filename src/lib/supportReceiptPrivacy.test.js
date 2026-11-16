import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Static regression for the anonymous public support receipt.
// This guards against reflecting optional contact PII onto a shared screen.
describe("public support receipt privacy", () => {
  it("does not interpolate the supplied contact email in confirmation copy", () => {
    const source = readFileSync(new URL("../pages/Support.jsx", import.meta.url), "utf8");
    expect(source).toContain("Your report has been saved. A reply is not guaranteed.");
    expect(source).not.toMatch(/Your report has been saved[^\n]*\$\{email\}/);
    expect(source).not.toContain("you provided ${email}");
  });
});
