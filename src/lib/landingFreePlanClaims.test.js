import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Public pricing promises must not invent fixed free-tier allowances when
// provider access and entitlement rules are still under release verification.
const landing = readFileSync(resolve(process.cwd(), "src/pages/Landing.jsx"), "utf8");
const freeFaq = landing.match(/q: "Do I need a paid plan to try it\?", a: "([^"]+)"/)?.[1];

describe("public free-plan claims", () => {
  it("offers a free starting path without unsupported numeric quotas", () => {
    expect(freeFaq).toBeTruthy();
    expect(freeFaq).toContain("free plan");
    expect(freeFaq).not.toMatch(/\b\d+\s*(?:days?|imports?|messages?)\b/i);
  });

  it("does not promise unverified automatic provider connections or paid access", () => {
    expect(freeFaq).toContain("provider availability");
    expect(freeFaq).toContain("account subscription");
    expect(freeFaq).not.toContain("unlimited sync");
  });
});
