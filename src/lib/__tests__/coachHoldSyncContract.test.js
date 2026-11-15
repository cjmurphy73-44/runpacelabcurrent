import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = (path) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Base44/GitHub coach hold conflict reconciliation", () => {
  it("verifies the persisted profile before broadcasting a cleared coach hold", () => {
    const hook = source("src/hooks/useCoachInjurySignal.js");
    const update = hook.indexOf("await base44.entities.AthleteProfile.update(");
    const readBack = hook.indexOf("await base44.entities.AthleteProfile.get(athleteId)", update);
    const verified = hook.indexOf("Number.isFinite(persistedMs)", readBack);
    const publish = hook.indexOf("publishHoldCleared(athleteId, persisted)", verified);
    expect(update).toBeGreaterThan(-1);
    expect(readBack).toBeGreaterThan(update);
    expect(verified).toBeGreaterThan(readBack);
    expect(publish).toBeGreaterThan(verified);
    expect(hook).not.toContain("saved?.coach_hold_cleared_at || now");
  });

  it("checks the plan gate before invoking the commit function and disables blocked commits", () => {
    const page = source("src/pages/TrainingPlan.jsx");
    const gate = page.indexOf("const blocked = planCommitBlockReason(injury)");
    const invoke = page.indexOf('base44.functions.invoke("commitTrainingPlan"');
    expect(gate).toBeGreaterThan(-1);
    expect(invoke).toBeGreaterThan(gate);
    expect(page).toContain("disabled={committing || Boolean(commitBlockReason)}");
    expect(page).toContain("Historical plan only");
  });

  it("retains failure, duplicate-click and unverified-persistence test coverage", () => {
    const tests = source("src/hooks/__tests__/useCoachInjurySignal.test.jsx");
    expect(tests).toContain("failed persistence leaves the hold active");
    expect(tests).toContain("ignores duplicate clearance clicks");
    expect(tests).toContain("saved profile lacks clearance");
    expect(tests).toContain("refreshes every mounted surface");
  });
});
