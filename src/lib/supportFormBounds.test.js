import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Static guard for the public form: server still must validate untrusted input.
describe("public support form input bounds", () => {
  const source = readFileSync(new URL("../pages/Support.jsx", import.meta.url), "utf8");
  const backend = readFileSync(new URL("../../base44/functions/logBetaFeedback/entry.ts", import.meta.url), "utf8");

  it("mirrors the current backend field lengths without silent client truncation", () => {
    expect(backend).toContain("slice(0, 4000)");
    expect(backend).toContain("slice(0, 200)");
    expect(source).toContain("maxLength={4000}");
    expect(source).toContain("maxLength={200}");
    expect(source).toContain("message.length > 4000 || email.length > 200");
  });

  it("blocks invalid programmatic submit state before invoking the SDK", () => {
    expect(source).toMatch(/if \(!message\.trim\(\) \|\| message\.length > 4000 \|\| email\.length > 200\) return;/);
  });
});
