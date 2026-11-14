import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(process.cwd(), "src/pages/Subscribe.jsx"), "utf8");

describe("subscription pricing claim integrity", () => {
  it("does not assert popularity without independently verified purchase data", () => {
    expect(source).not.toMatch(/most popular|best seller|most chosen|top selling/i);
  });

  it("retains an explicitly editorial featured-plan label and does not imply sales ranking", () => {
    expect(source).toContain(">Featured plan</span>");
    expect(source).toContain("d.highlighted");
  });
});
