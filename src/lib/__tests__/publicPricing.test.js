import { describe, expect, it } from "vitest";
import { publicPlanAction, planHighlightLabel } from "../publicPricing";

describe("public pricing interactions", () => {
  it("sends unauthenticated visitors through signup before any paid checkout", () => {
    for (const tier of ["pro", "unlimited", "coach_pro"]) {
      expect(publicPlanAction(tier, {}, false))
        .toEqual({ label: "Create account to upgrade", to: "/register", disabled: false });
    }
  });
  it("keeps free signup distinct from paid plan selection", () => {
    expect(publicPlanAction("free", {}, false)).toEqual({
      label: "Start free", to: "/register", disabled: false,
    });
  });
  it("routes authenticated users to a plan-management entry point", () => {
    expect(publicPlanAction("pro", {}, true)).toEqual({
      label: "View your plans", to: "/subscribe", disabled: false,
    });
  });
  it("never offers checkout for plans explicitly marked coming soon", () => {
    expect(publicPlanAction("coach_pro", { comingSoon: true }, true))
      .toEqual({ label: "Coming soon", to: null, disabled: true });
    expect(publicPlanAction("coach_pro", { comingSoon: true }, false).disabled).toBe(true);
  });
  it("labels editorial emphasis without claiming popularity or paid traction", () => {
    expect(planHighlightLabel({ highlighted: true })).toBe("Featured plan");
    expect(planHighlightLabel({ highlighted: false })).toBeNull();
    expect(planHighlightLabel(undefined)).toBeNull();
  });
});
