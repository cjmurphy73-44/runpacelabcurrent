import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Offline policy contract. Vercel owns the actual minimatch evaluation and
// deployment decision; these tests intentionally do not call Vercel.
const configPath = fileURLToPath(new URL("../../../vercel.json", import.meta.url));
const policy = JSON.parse(readFileSync(configPath, "utf8")).git.deploymentEnabled;

function matchesOurPolicyGlob(pattern, branch) {
  // Only the three explicitly approved policy patterns are modeled here.
  // Treat any newly introduced pattern as untested rather than guessing.
  if (pattern === "**") return true;
  if (pattern === "main") return branch === "main";
  if (pattern === "release/**") return branch.startsWith("release/") && branch.length > "release/".length;
  throw new Error(`Unsupported deployment pattern: ${pattern}`);
}

function permitsDeployment(branch) {
  const matching = Object.entries(policy).filter(([glob]) => matchesOurPolicyGlob(glob, branch));
  // Vercel documents that any matching true takes precedence over false.
  return matching.length === 0 || matching.some(([, enabled]) => enabled === true);
}

describe("Vercel Git deployment quota policy", () => {
  it("keeps the reviewed production branch enabled and refuses global disabling", () => {
    expect(policy).toEqual({
      main: true,
      "release/**": true,
      "**": false,
    });
    expect(permitsDeployment("main")).toBe(true);
  });

  it.each([
    "release/beta",
    "release/2026-11",
    "release/candidate/build-1",
  ])("permits designated release preview %s", (branch) => {
    expect(permitsDeployment(branch)).toBe(true);
  });

  it.each([
    "codex/pay-billing-portal-url-validation-20261115",
    "fix/tpl-base44-coach-hold-sync-conflicts-20261115",
    "science/audit-134-vdot-race-entry-review",
    "ops/vercel-preview-quota-policy-20261115",
    "feature/preview",
    "staging",
    "release-candidate",
  ])("suppresses routine non-release preview %s", (branch) => {
    expect(permitsDeployment(branch)).toBe(false);
  });
});
