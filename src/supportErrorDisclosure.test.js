import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

// Static contract guard: Base44 function imports a remote SDK and cannot be
// executed in ordinary Vitest without a mocked Base44 runtime.
const source = readFileSync(new URL("../base44/functions/logBetaFeedback/entry.ts", import.meta.url), "utf8");

describe("public support backend error disclosure", () => {
  it("returns a generic failure instead of the caught exception", () => {
    const catchBlock = source.slice(source.lastIndexOf("} catch (error)"));
    expect(catchBlock).toContain("status: 500");
    expect(catchBlock).toMatch(/Response\.json\(\{ error: ['"`]Support request could not be confirmed['"`] \}/);
    expect(catchBlock).not.toMatch(/Response\.json\(\{ error: error(?:\.|\b)/);
  });

  it("does not include the internal exception in the public response", () => {
    expect(source).not.toMatch(/Response\.json\(\{ error: error\.message/);
  });
});
