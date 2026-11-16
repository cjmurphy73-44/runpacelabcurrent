import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Static guard for the public form: server still must validate untrusted input.
describe("public support form input bounds", () => {
  const source = readFileSync(new URL("../pages/Support.jsx", import.meta.url), "utf8");
  const backend = readFileSync(new URL("../../base44/functions/logBetaFeedback/entry.ts", import.meta.url), "utf8");

  it("mirrors the current backend field lengths without silent client truncation", () => {
    expect(backend).toContain("body.message.length > 4000");
    expect(backend).toContain("body.contact_email.length > 200");
    expect(backend).toContain("support fields exceed allowed length");
    expect(backend).not.toContain("String(body.message || '').slice");
    expect(source).toContain("maxLength={4000}");
    expect(source).toContain("maxLength={200}");
    expect(source).toContain("message.length > 4000 || email.length > 200");
  });

  it("blocks invalid programmatic submit state before invoking the SDK", () => {
    expect(source).toMatch(/if \(!message\.trim\(\) \|\| message\.length > 4000 \|\| email\.length > 200\) return;/);
  });
});

describe("public support backend rejects before privileged persistence", () => {
  const backend = readFileSync(new URL("../../base44/functions/logBetaFeedback/entry.ts", import.meta.url), "utf8");

  it("validates type, presence and length before service-role create", () => {
    const validation = backend.indexOf("typeof body.message !== 'string'");
    const bounds = backend.indexOf("body.message.length > 4000");
    const write = backend.indexOf("entities.BetaFeedback.create(");
    expect(validation).toBeGreaterThan(-1);
    expect(bounds).toBeGreaterThan(validation);
    expect(write).toBeGreaterThan(bounds);
  });

  it("rejects malformed contact emails without stringifying objects", () => {
    expect(backend).toContain("typeof body.contact_email !== 'string'");
    expect(backend).not.toContain("String(body.contact_email).slice");
  });
});
