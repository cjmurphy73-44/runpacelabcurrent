import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const subscriptionSource = readFileSync(resolve(process.cwd(), "src/pages/Subscribe.jsx"), "utf8");

describe("pricing popularity claim evidence gate", () => {
  it("does not claim a plan is most popular without verified customer data", () => {
    expect(subscriptionSource).not.toMatch(/Most popular/i);
  });

  it("retains visual highlighting without converting it into a popularity claim", () => {
    expect(subscriptionSource).toContain('d.highlighted ? "border-primary shadow-md" : ""');
    expect(subscriptionSource).toContain("PLAN_TIERS.map");
  });

  it("keeps the server-sourced current-plan display", () => {
    expect(subscriptionSource).toContain("PLAN_DETAILS[currentPlan]?.label");
    expect(subscriptionSource).toContain("useSubscription()");
  });
});
